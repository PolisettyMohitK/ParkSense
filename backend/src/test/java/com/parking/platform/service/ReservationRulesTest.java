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
    void autoAssignsTheFirstAvailableSpaceAndHoldsItWhenStartingSoon() {
        Instant start = Instant.now().plus(5, ChronoUnit.MINUTES);

        var response = reservationService.create(
                request(car.getId(), null, start, start.plus(2, ChronoUnit.HOURS)));

        assertThat(response.assignedSpaceId()).isEqualTo(firstSpace.getId());
        ParkingSpace reserved = spaces.findById(firstSpace.getId()).orElseThrow();
        assertThat(reserved.isReserved()).isTrue();
        assertThat(reserved.getStatus()).isEqualTo(SpaceStatus.RESERVED);
    }

    @Test
    void aFutureBookingDoesNotBlockTheSpaceToday() {
        Instant start = Instant.now().plus(3, ChronoUnit.HOURS);
        reservationService.create(request(car.getId(), firstSpace.getId(), start, start.plus(1, ChronoUnit.HOURS)));

        assertThat(spaces.findById(firstSpace.getId()).orElseThrow().getStatus()).isEqualTo(SpaceStatus.AVAILABLE);

        // ...but someone wanting it now, for a slot that does not overlap, still gets it.
        asUser(otherDriver);
        var now = reservationService.create(request(otherCar.getId(), firstSpace.getId(),
                Instant.now(), Instant.now().plus(2, ChronoUnit.HOURS)));
        assertThat(now.assignedSpaceId()).isEqualTo(firstSpace.getId());
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
    void aDriverCannotReadSomeoneElsesReservation() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        var mine = reservationService.create(
                request(car.getId(), firstSpace.getId(), start, start.plus(1, ChronoUnit.HOURS)));

        assertThat(reservationService.findById(mine.id()).id()).isEqualTo(mine.id());
        asUser(otherDriver);
        assertThatThrownBy(() -> reservationService.findById(mine.id())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> reservationService.cancel(mine.id())).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void autoAssignSkipsBookedSpacesAndRejectsWhenTheZoneIsFull() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        Instant end = start.plus(2, ChronoUnit.HOURS);
        var first = reservationService.create(request(car.getId(), null, start, end));

        asUser(otherDriver);
        var second = reservationService.create(request(otherCar.getId(), null, start, end));
        assertThat(second.assignedSpaceId()).isNotEqualTo(first.assignedSpaceId());

        User third = users.save(Fixtures.user(zone.getSite().getOrganization(), "third@res.dev", Role.USER, encoder));
        Vehicle thirdCar = vehicles.save(Fixtures.vehicle(third, "KA01CC0003"));
        asUser(third);
        assertThatThrownBy(() -> reservationService.create(
                new ReservationRequest(null, thirdCar.getId(), zone.getId(), null, start, end)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("No space is available");
    }

    @Test
    void rejectsBookingsInThePastOrLongerThanADay() {
        Instant past = Instant.now().minus(2, ChronoUnit.HOURS);
        assertThatThrownBy(() -> reservationService.create(
                request(car.getId(), null, past, past.plus(1, ChronoUnit.HOURS))))
                .isInstanceOf(BadRequestException.class);

        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        assertThatThrownBy(() -> reservationService.create(
                request(car.getId(), null, start, start.plus(25, ChronoUnit.HOURS))))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void theSameVehicleCannotHoldTwoOverlappingBookings() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        reservationService.create(request(car.getId(), null, start, start.plus(2, ChronoUnit.HOURS)));
        assertThatThrownBy(() -> reservationService.create(
                request(car.getId(), null, start.plus(1, ChronoUnit.HOURS), start.plus(3, ChronoUnit.HOURS))))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void driversCannotCompleteTheirOwnBookings() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        var created = reservationService.create(request(car.getId(), null, start, start.plus(1, ChronoUnit.HOURS)));
        assertThatThrownBy(() -> reservationService.complete(created.id())).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void quotesTheEstimatedPriceAtBookingTime() {
        Instant start = Instant.now().plus(1, ChronoUnit.HOURS);
        var created = reservationService.create(
                request(car.getId(), null, start, start.plus(90, ChronoUnit.MINUTES)));
        // Rs 60/h, 1.5h rounds up to 2 started hours
        assertThat(created.estimatedAmount()).isEqualByComparingTo("120");
        assertThat(created.siteName()).isEqualTo(zone.getSite().getName());
    }
}
