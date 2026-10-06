package com.parking.platform.service;

import com.parking.platform.dto.request.ReservationRequest;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.entity.enums.SpaceStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.support.BaseServiceTest;
import com.parking.platform.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Reservation invariants: validation, overlap protection, auto-assignment and release. */
class ReservationRulesTest extends BaseServiceTest {

    @Autowired private ReservationService reservationService;

    private ParkingZone zone;
    private ParkingSpace firstSpace;
    private User driver;
    private User otherDriver;
    private Vehicle car;
    private Vehicle otherCar;

    @BeforeEach
    void setUp() {
        Organization organization = organizations.save(Fixtures.organization("RES"));
        var site = sites.save(Fixtures.site(organization, "RES-S1", 12.97, 77.60,
                PlaceCategory.MALL, BigDecimal.valueOf(60)));
        zone = zones.save(Fixtures.zone(site, "Z1"));
        firstSpace = spaces.save(Fixtures.space(zone, "A01"));
        spaces.save(Fixtures.space(zone, "A02"));
        driver = users.save(Fixtures.user(organization, "driver@res.dev", Role.USER, encoder));
        otherDriver = users.save(Fixtures.user(organization, "other@res.dev", Role.USER, encoder));
        car = vehicles.save(Fixtures.vehicle(driver, "KA01AA0001"));
        otherCar = vehicles.save(Fixtures.vehicle(otherDriver, "KA01BB0002"));
        // Every request in the app is authenticated; act as the driver by default.
        asUser(driver);
    }

    private ReservationRequest request(Long vehicleId, Long assignedSpaceId, Instant start, Instant end) {
        return new ReservationRequest(driver.getId(), vehicleId, zone.getId(), assignedSpaceId, start, end);
    }

    @Test
    void rejectsEndTimeBeforeStartTime() {
        Instant start = Instant.now();
        assertThatThrownBy(() -> reservationService.create(
                request(car.getId(), null, start, start.minus(1, ChronoUnit.HOURS))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void autoAssignsTheFirstAvailableSpaceAndMarksItReserved() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);

        var response = reservationService.create(
                request(car.getId(), null, start, start.plus(2, ChronoUnit.HOURS)));

        assertThat(response.assignedSpaceId()).isEqualTo(firstSpace.getId());
        ParkingSpace reserved = spaces.findById(firstSpace.getId()).orElseThrow();
        assertThat(reserved.isReserved()).isTrue();
        assertThat(reserved.getStatus()).isEqualTo(SpaceStatus.RESERVED);
    }

    @Test
    void blocksOverlappingReservationForTheSameSpace() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        reservationService.create(request(car.getId(), firstSpace.getId(), start, start.plus(2, ChronoUnit.HOURS)));

        asUser(otherDriver);
        assertThatThrownBy(() -> reservationService.create(
                request(otherCar.getId(), firstSpace.getId(), start.plus(1, ChronoUnit.HOURS),
                        start.plus(3, ChronoUnit.HOURS))))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void cancelReleasesTheAssignedSpace() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        var created = reservationService.create(
                request(car.getId(), null, start, start.plus(2, ChronoUnit.HOURS)));

        reservationService.cancel(created.id());

        Reservation cancelled = reservations.findById(created.id()).orElseThrow();
        assertThat(cancelled.getStatus()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(spaces.findById(firstSpace.getId()).orElseThrow().isReserved()).isFalse();
    }

    @Test
    void aDriverCannotReserveWithSomeoneElsesVehicle() {
        asUser(driver);
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);

        assertThatThrownBy(() -> reservationService.create(
                request(otherCar.getId(), null, start, start.plus(1, ChronoUnit.HOURS))))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void aDriverOnlySeesTheirOwnReservations() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        reservationService.create(request(car.getId(), firstSpace.getId(), start, start.plus(1, ChronoUnit.HOURS)));

        List<Reservation> mine = reservations.findAllByUserId(driver.getId());
        List<Reservation> theirs = reservations.findAllByUserId(otherDriver.getId());

        assertThat(mine).hasSize(1);
        assertThat(theirs).isEmpty();
    }
}
