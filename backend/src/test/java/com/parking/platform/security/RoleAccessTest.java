package com.parking.platform.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The role gate at the HTTP layer: 401 when anonymous, 403 when the role is too
 * low, and pass-through when the role is sufficient.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoleAccessTest {

    @Autowired private MockMvc mvc;

    @Test
    void anonymousRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/organizations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/places")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")
    void driverCannotReadOrganizations() throws Exception {
        mvc.perform(get("/api/organizations")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanReadOrganizations() throws Exception {
        mvc.perform(get("/api/organizations")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    void driverCannotPostOccupancyEvents() throws Exception {
        mvc.perform(post("/api/occupancy/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"spaceId\":1,\"state\":\"OCCUPIED\",\"source\":\"MANUAL\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerPassesTheGateOnOccupancy() throws Exception {
        // Authorised but the space does not exist, so the request reaches the
        // controller and fails on the resource rather than on the role.
        mvc.perform(post("/api/occupancy/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"spaceId\":999999,\"state\":\"OCCUPIED\",\"source\":\"MANUAL\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "USER")
    void driverCanUseTheirOwnBookingEndpoints() throws Exception {
        mvc.perform(get("/api/reservations")).andExpect(status().isOk());
        mvc.perform(get("/api/vehicles")).andExpect(status().isOk());
        mvc.perform(get("/api/places")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    void driverCannotReachManagerOnlySurfaces() throws Exception {
        mvc.perform(get("/api/devices")).andExpect(status().isForbidden());
        mvc.perform(get("/api/analytics/summary")).andExpect(status().isForbidden());
    }

    @Test
    void healthAndAuthRemainPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }
}
