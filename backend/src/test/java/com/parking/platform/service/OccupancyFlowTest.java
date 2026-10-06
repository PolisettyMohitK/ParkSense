package com.parking.platform.service;

import com.parking.platform.dto.request.OccupancyEventRequest;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.entity.enums.SpaceStatus;
import com.parking.platform.support.BaseServiceTest;
import com.parking.platform.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The occupancy engine: append-only events, derived space state, idempotent
 * ingestion and the session lifecycle it drives.
 */
class OccupancyFlowTest extends BaseServiceTest {

    @Autowired private OccupancyService occupancy;
    @Autowired private ParkingZoneService zoneService;

    private ParkingSpace space;
    private User manager;

    @BeforeEach
    void setUp() {
        Organization organization = organizations.save(Fixtures.organization("OCC"));
        var site = sites.save(Fixtures.site(organization, "OCC-S1", 12.97, 77.60,
                PlaceCategory.OFFICE, BigDecimal.valueOf(50)));
        ParkingZone zone = zones.save(Fixtures.zone(site, "Z1"));
        space = spaces.save(Fixtures.space(zone, "A01"));
        manager = users.save(Fixtures.user(organization, "manager@occ.dev", Role.MANAGER, encoder));
    }

    private OccupancyEventRequest request(OccupancyState state, String externalId) {
        return new OccupancyEventRequest(space.getId(), state, EventSource.CAMERA, 0.9,
                null, null, externalId, null, Instant.now());
    }

    @Test
    void appendsEventAndDerivesOccupied() {
        occupancy.recordEvent(request(OccupancyState.OCCUPIED, null));

        ParkingSpace reloaded = spaces.findById(space.getId()).orElseThrow();
        assertThat(reloaded.getOccupancyState()).isEqualTo(OccupancyState.OCCUPIED);
        assertThat(reloaded.getStatus()).isEqualTo(SpaceStatus.OCCUPIED);
        assertThat(events.count()).isEqualTo(1);
    }

    @Test
    void vacantReturnsSpaceToAvailable() {
        occupancy.recordEvent(request(OccupancyState.OCCUPIED, null));
        occupancy.recordEvent(request(OccupancyState.VACANT, null));

        ParkingSpace reloaded = spaces.findById(space.getId()).orElseThrow();
        assertThat(reloaded.getOccupancyState()).isEqualTo(OccupancyState.VACANT);
        assertThat(reloaded.getStatus()).isEqualTo(SpaceStatus.AVAILABLE);
        assertThat(events.count()).isEqualTo(2);
    }

    @Test
    void repeatingTheSameExternalIdIsIdempotent() {
        var first = occupancy.recordEvent(request(OccupancyState.OCCUPIED, "frame-1"));
        var second = occupancy.recordEvent(request(OccupancyState.OCCUPIED, "frame-1"));

        assertThat(second.id()).isEqualTo(first.id());
        assertThat(events.count()).isEqualTo(1);
    }

    @Test
    void occupiedOpensSessionAndVacantClosesIt() {
        occupancy.recordEvent(new OccupancyEventRequest(space.getId(), OccupancyState.OCCUPIED,
                EventSource.MANUAL, null, manager.getId(), null, null, null,
                Instant.now().minus(90, ChronoUnit.MINUTES)));

        var active = sessions.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(space.getId(), SessionStatus.ACTIVE);
        assertThat(active).isPresent();
        assertThat(active.orElseThrow().getUser()).isNotNull();

        occupancy.recordEvent(request(OccupancyState.VACANT, null));

        var completed = sessions.findAllBySpaceIdOrderByCheckInAtDesc(space.getId());
        assertThat(completed).hasSize(1);
        assertThat(completed.get(0).getStatus()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(completed.get(0).getCheckOutAt()).isNotNull();
        assertThat(completed.get(0).getDurationMinutes()).isNotNegative();
    }

    @Test
    void outOfServiceOverridesDerivedStatus() {
        space.setOperationalState(OperationalState.OUT_OF_SERVICE);
        spaces.save(space);

        occupancy.recordEvent(request(OccupancyState.OCCUPIED, null));

        ParkingSpace reloaded = spaces.findById(space.getId()).orElseThrow();
        assertThat(reloaded.getOccupancyState()).isEqualTo(OccupancyState.OCCUPIED);
        assertThat(reloaded.getStatus()).isEqualTo(SpaceStatus.OUT_OF_SERVICE);
        assertThat(zoneService.occupancy(space.getZone().getId()).outOfService()).isEqualTo(1);
    }
}
