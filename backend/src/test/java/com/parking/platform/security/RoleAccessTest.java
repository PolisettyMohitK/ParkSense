package com.parking.platform.security;

import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The role gate at the HTTP layer, exercised with real signed JWTs through the authentication
 * filter: 401 when anonymous or the token is bad, 403 when the role is too low, and pass-through
 * when the role is sufficient.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RoleAccessTest {

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JwtService jwtService;

    private String driverToken;
    private String managerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        driverToken = tokenFor("role-driver@test.dev", Role.USER, true);
        managerToken = tokenFor("role-manager@test.dev", Role.MANAGER, true);
        adminToken = tokenFor("role-admin@test.dev", Role.ADMIN, true);
    }

    private String tokenFor(String email, Role role, boolean enabled) {
        User user = users.findByEmail(email).orElseGet(() -> users.save(User.builder()
                .fullName(email)
                .email(email)
                .passwordHash(encoder.encode("secret123"))
                .role(role)
                .enabled(true)
                .build()));
        user.setEnabled(enabled);
        users.save(user);
        return jwtService.generateToken(new UserPrincipal(user));
    }

    private static MockHttpServletRequestBuilder as(String token, MockHttpServletRequestBuilder request) {
        return request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    @Test
    void anonymousRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/organizations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/places")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me/sessions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void tamperedOrDisabledTokensAreRejected() throws Exception {
        String[] parts = driverToken.split("\\.");
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"sub\":\"role-admin@test.dev\",\"role\":\"ADMIN\"}".getBytes());
        String forged = parts[0] + "." + forgedPayload + "." + parts[2];
        mvc.perform(as(forged, get("/api/vehicles"))).andExpect(status().isUnauthorized());

        String disabled = tokenFor("role-disabled@test.dev", Role.USER, false);
        mvc.perform(as(disabled, get("/api/vehicles"))).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsTheSignedInUser() throws Exception {
        mvc.perform(as(driverToken, get("/api/auth/me")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("role-driver@test.dev"))
                .andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void driverCannotReadOrganizations() throws Exception {
        mvc.perform(as(driverToken, get("/api/organizations"))).andExpect(status().isForbidden());
    }

    @Test
    void adminCanReadOrganizations() throws Exception {
        mvc.perform(as(adminToken, get("/api/organizations"))).andExpect(status().isOk());
    }

    @Test
    void driverCannotPostOrReadOccupancyEvents() throws Exception {
        mvc.perform(as(driverToken, post("/api/occupancy/events"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"spaceId\":1,\"state\":\"OCCUPIED\",\"source\":\"MANUAL\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(as(driverToken, get("/api/occupancy/spaces/1/history"))).andExpect(status().isForbidden());
    }

    @Test
    void managerPassesTheGateOnOccupancy() throws Exception {
        // Authorised but the space does not exist, so the request reaches the
        // controller and fails on the resource rather than on the role.
        mvc.perform(as(managerToken, post("/api/occupancy/events"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"spaceId\":999999,\"state\":\"OCCUPIED\",\"source\":\"MANUAL\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void driverCanUseTheirOwnBookingEndpoints() throws Exception {
        mvc.perform(as(driverToken, get("/api/reservations"))).andExpect(status().isOk());
        mvc.perform(as(driverToken, get("/api/vehicles"))).andExpect(status().isOk());
        mvc.perform(as(driverToken, get("/api/places"))).andExpect(status().isOk());
        mvc.perform(as(driverToken, get("/api/me"))).andExpect(status().isOk());
    }

    @Test
    void driverCanAccessPublicZonesAndSpacesEndpoints() throws Exception {
        // Site does not exist, so it passes the security gate and 404s in the service layer, not 403.
        mvc.perform(as(driverToken, get("/api/places/999999/zones"))).andExpect(status().isNotFound());
        mvc.perform(as(driverToken, get("/api/places/999999/zones/999999/spaces"))).andExpect(status().isNotFound());
    }

    @Test
    void driverCanAccessPersonalSessionsEndpoints() throws Exception {
        mvc.perform(as(driverToken, get("/api/me/sessions"))).andExpect(status().isOk());
        mvc.perform(as(driverToken, get("/api/me/sessions/active"))).andExpect(status().isNoContent());
    }

    @Test
    void driverCannotReachManagerOnlySurfaces() throws Exception {
        for (String path : new String[]{"/api/devices", "/api/analytics/summary", "/api/parking/spaces",
                "/api/parking/zones", "/api/parking/sites", "/api/sessions", "/api/sessions/1",
                "/api/sessions/spaces/1/active"}) {
            mvc.perform(as(driverToken, get(path))).andExpect(status().isForbidden());
        }
    }

    @Test
    void driverCannotReadAnotherUsersProfileById() throws Exception {
        User manager = users.findByEmail("role-manager@test.dev").orElseThrow();
        mvc.perform(as(driverToken, get("/api/users/" + manager.getId()))).andExpect(status().isForbidden());
    }

    @Test
    void clientMistakesAreReportedAs4xxNot500() throws Exception {
        mvc.perform(as(driverToken, post("/api/reservations"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest());
        mvc.perform(as(driverToken, post("/api/vehicles"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"plateNumber\":\"TS09AB1234\",\"type\":\"SPACESHIP\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(as(managerToken, get("/api/sessions").param("status", "NOPE")))
                .andExpect(status().isBadRequest());
        mvc.perform(as(driverToken, get("/api/places/abc"))).andExpect(status().isBadRequest());
    }

    @Test
    void registerRejectsWeakPasswordsAndAlwaysCreatesDrivers() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Weak\",\"email\":\"weak@test.dev\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Sneaky\",\"email\":\"Sneaky@Test.dev\",\"password\":\"longenough1\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.email").value("sneaky@test.dev"));
    }

    @Test
    void publicSpaceResponseDoesNotExposeInternalFields() throws Exception {
        com.parking.platform.dto.response.PublicSpaceResponse response =
                new com.parking.platform.dto.response.PublicSpaceResponse(
                        1L, "A-01", "Level 1 A-01",
                        com.parking.platform.entity.enums.SpaceStatus.AVAILABLE,
                        10.5, 20.5, "[[0,0],[1,0],[1,1],[0,1]]"
                );
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        String json = mapper.writeValueAsString(response);
        org.junit.jupiter.api.Assertions.assertFalse(json.contains("deviceId"));
        org.junit.jupiter.api.Assertions.assertFalse(json.contains("verificationStatus"));
        org.junit.jupiter.api.Assertions.assertFalse(json.contains("internalNote"));
        org.junit.jupiter.api.Assertions.assertTrue(json.contains("A-01"));
    }

    @Test
    void healthRemainsPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk());
    }
}
