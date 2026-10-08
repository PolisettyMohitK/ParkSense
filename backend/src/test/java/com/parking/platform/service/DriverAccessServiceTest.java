package com.parking.platform.service;

import com.parking.platform.dto.response.MySessionResponse;
import com.parking.platform.dto.response.PublicSpaceResponse;
import com.parking.platform.dto.response.PublicZoneResponse;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSession;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.support.BaseServiceTest;
import com.parking.platform.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class DriverAccessServiceTest extends BaseServiceTest {

    @Autowired private PlaceService placeService;
    @Autowired private ParkingSessionService sessionService;

    private User driverA;
    private User driverB;
    private ParkingSite site;
    private ParkingZone zone;
    private ParkingSpace space1;
    private ParkingSpace space2;

    @BeforeEach
    void setup() {
        Organization org = organizations.save(Fixtures.organization("ACCESS-ORG"));
        driverA = users.save(Fixtures.user(org, "driverA@test.dev", Role.USER, encoder));
        driverB = users.save(Fixtures.user(org, "driverB@test.dev", Role.USER, encoder));

        site = sites.save(Fixtures.site(org, "SITE-1", 12.97, 77.59, PlaceCategory.CAFE, BigDecimal.valueOf(40)));
        zone = zones.save(Fixtures.zone(site, "Z-1"));

        space1 = spaces.save(Fixtures.space(zone, "S-01"));
        space2 = spaces.save(Fixtures.space(zone, "S-02"));

        Vehicle vehicleA = vehicles.save(Fixtures.vehicle(driverA, "KA01AB1234"));
        Vehicle vehicleB = vehicles.save(Fixtures.vehicle(driverB, "KA01CD5678"));

        sessions.save(ParkingSession.builder()
                .code("SESS-A-ACTIVE")
                .space(space1)
                .user(driverA)
                .vehicle(vehicleA)
                .source(EventSource.MANUAL)
                .status(SessionStatus.ACTIVE)
                .checkInAt(Instant.now())
                .build());

        sessions.save(ParkingSession.builder()
                .code("SESS-B-ACTIVE")
                .space(space2)
                .user(driverB)
                .vehicle(vehicleB)
                .source(EventSource.MANUAL)
                .status(SessionStatus.ACTIVE)
                .checkInAt(Instant.now())
                .build());
    }

    @Test
    void driverCannotSeeOtherDriverSessions() {
        asUser(driverA);
        List<MySessionResponse> mySessions = sessionService.findMySessions();
        assertThat(mySessions).hasSize(1);
        assertThat(mySessions.get(0).code()).isEqualTo("SESS-A-ACTIVE");

        asUser(driverB);
        List<MySessionResponse> driverBSessions = sessionService.findMySessions();
        assertThat(driverBSessions).hasSize(1);
        assertThat(driverBSessions.get(0).code()).isEqualTo("SESS-B-ACTIVE");
    }

    @Test
    void driverFindsActiveSession() {
        asUser(driverA);
        Optional<MySessionResponse> active = sessionService.findMyActiveSession();
        assertThat(active).isPresent();
        assertThat(active.get().code()).isEqualTo("SESS-A-ACTIVE");
        assertThat(active.get().spaceCode()).isEqualTo("S-01");
        assertThat(active.get().plateNumber()).isEqualTo("KA01AB1234");
    }

    @Test
    void publicZonesAndSpacesOmitInternalFieldsAndUnverifiedSpaces() {
        // Add an unverified proposed space
        ParkingSpace unverifiedSpace = Fixtures.space(zone, "S-PROPOSED");
        unverifiedSpace.setVerificationStatus(VerificationStatus.PROPOSED);
        spaces.save(unverifiedSpace);

        List<PublicZoneResponse> publicZones = placeService.findPublicZones(site.getId());
        assertThat(publicZones).hasSize(1);
        assertThat(publicZones.get(0).code()).isEqualTo("Z-1");

        List<PublicSpaceResponse> publicSpaces = placeService.findPublicSpaces(site.getId(), zone.getId());
        // Only verified spaces returned (S-01, S-02), proposed space is excluded
        assertThat(publicSpaces).hasSize(2);
        assertThat(publicSpaces).extracting(PublicSpaceResponse::code).containsExactlyInAnyOrder("S-01", "S-02");
    }
}
