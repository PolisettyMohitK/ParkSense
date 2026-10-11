package com.parking.platform.service;

import com.parking.platform.dto.request.OccupancyEventRequest;
import com.parking.platform.dto.request.ParkingSiteRequest;
import com.parking.platform.dto.request.ReservationRequest;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.PaymentMethod;
import com.parking.platform.entity.enums.PaymentStatus;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.entity.enums.SpaceStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.support.BaseServiceTest;
import com.parking.platform.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** End-to-end booking lifecycle: arrival linking, self check-in/out, pricing, payment and no-shows. */
class BookingLifecycleTest extends BaseServiceTest {

    @Autowired private ReservationService reservationService;
    @Autowired private OccupancyService occupancyService;
    @Autowired private ParkingSessionService sessionService;
    @Autowired private ReservationLifecycleJob lifecycleJob;
    @Autowired private ParkingSiteService siteService;

    private Organization organization;
    private ParkingSite paidSite;
    private ParkingZone zone;
    private ParkingSpace space;
    private User driver;
    private User manager;
    private Vehicle car;

    @BeforeEach
    void setUp() {
        organization = organizations.save(Fixtures.organization("LIFE"));
        paidSite = sites.save(Fixtures.site(organization, "LIFE-S1", 17.4, 78.4, PlaceCategory.MALL,
                BigDecimal.valueOf(40)));
        zone = zones.save(Fixtures.zone(paidSite, "Z1"));
        space = spaces.save(Fixtures.space(zone, "A01"));
        driver = users.save(Fixtures.user(organization, "driver@life.dev", Role.USER, encoder));
        manager = users.save(Fixtures.user(organization, "manager@life.dev", Role.MANAGER, encoder));
        car = vehicles.save(Fixtures.vehicle(driver, "TS09LF0001"));
        asUser(driver);
    }

    private ReservationRequest booking(Instant start, Instant end) {
        return new ReservationRequest(null, car.getId(), zone.getId(), space.getId(), start, end);
    }

    @Test
    void aCarArrivingEarlyIsNotAttributedToALaterBooking() {
        var later = reservationService.create(booking(
                Instant.now().plus(3, ChronoUnit.HOURS), Instant.now().plus(4, ChronoUnit.HOURS)));

        asUser(manager);
        occupancyService.recordEvent(new OccupancyEventRequest(space.getId(), OccupancyState.OCCUPIED,
                EventSource.MANUAL, null, null, null, null, null, Instant.now()));

        var session = sessions.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(space.getId(), SessionStatus.ACTIVE)
                .orElseThrow();
        assertThat(session.getReservation()).isNull();
        assertThat(session.getUser()).isNull();
        assertThat(reservations.findById(later.id()).orElseThrow().getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
    }

    @Test
    void driverChecksInAndOutAndPaysForTheBookedSlot() {
        var reservation = reservationService.create(booking(
                Instant.now(), Instant.now().plus(2, ChronoUnit.HOURS)));
        assertThat(spaces.findById(space.getId()).orElseThrow().getStatus()).isEqualTo(SpaceStatus.RESERVED);

        var checkedIn = reservationService.checkIn(reservation.id());
        assertThat(checkedIn.status()).isEqualTo(ReservationStatus.ACTIVE);
        assertThat(spaces.findById(space.getId()).orElseThrow().getStatus()).isEqualTo(SpaceStatus.OCCUPIED);
        var active = sessionService.findMyActiveSession().orElseThrow();
        assertThat(active.reservationId()).isEqualTo(reservation.id());
        assertThat(active.amount()).isEqualByComparingTo("40"); // first started hour

        var stay = reservationService.checkOut(reservation.id());
        assertThat(stay.status()).isEqualTo(SessionStatus.COMPLETED);
        // Left early, but pays for the 2 hours that were held.
        assertThat(stay.amount()).isEqualByComparingTo("80");
        assertThat(stay.paymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(reservations.findById(reservation.id()).orElseThrow().getStatus())
                .isEqualTo(ReservationStatus.COMPLETED);
        assertThat(spaces.findById(space.getId()).orElseThrow().getStatus()).isEqualTo(SpaceStatus.AVAILABLE);

        var paid = sessionService.payMine(stay.id(), PaymentMethod.UPI);
        assertThat(paid.paymentStatus()).isEqualTo(PaymentStatus.PAID);
        assertThat(paid.paymentRef()).startsWith("PAY-");
        assertThatThrownBy(() -> sessionService.payMine(stay.id(), PaymentMethod.UPI))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void anotherDriverCannotPayOrCheckInForYou() {
        var reservation = reservationService.create(booking(Instant.now(), Instant.now().plus(1, ChronoUnit.HOURS)));
        User stranger = users.save(Fixtures.user(organization, "stranger@life.dev", Role.USER, encoder));
        asUser(stranger);
        assertThatThrownBy(() -> reservationService.checkIn(reservation.id())).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void complimentaryVenuesDoNotAskForPayment() {
        paidSite.setHourlyRate(null);
        sites.save(paidSite);
        var reservation = reservationService.create(booking(Instant.now(), Instant.now().plus(1, ChronoUnit.HOURS)));
        assertThat(reservation.estimatedAmount()).isEqualByComparingTo("0");

        reservationService.checkIn(reservation.id());
        var stay = reservationService.checkOut(reservation.id());
        assertThat(stay.paymentStatus()).isEqualTo(PaymentStatus.NOT_REQUIRED);
        assertThatThrownBy(() -> sessionService.payMine(stay.id(), PaymentMethod.CARD))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void checkInIsRefusedWellBeforeTheBookingStarts() {
        var reservation = reservationService.create(booking(
                Instant.now().plus(2, ChronoUnit.HOURS), Instant.now().plus(3, ChronoUnit.HOURS)));
        assertThatThrownBy(() -> reservationService.checkIn(reservation.id()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Too early");
    }

    @Test
    void anActiveBookingCannotBeCancelled() {
        var reservation = reservationService.create(booking(Instant.now(), Instant.now().plus(1, ChronoUnit.HOURS)));
        reservationService.checkIn(reservation.id());
        assertThatThrownBy(() -> reservationService.cancel(reservation.id())).isInstanceOf(BadRequestException.class);
    }

    @Test
    void noShowsExpireAndReleaseTheirSpace() {
        Reservation noShow = reservations.save(Reservation.builder()
                .code("RES-NOSHOW01")
                .user(driver)
                .vehicle(car)
                .zone(zone)
                .assignedSpace(space)
                .status(ReservationStatus.CONFIRMED)
                .startTime(Instant.now().minus(40, ChronoUnit.MINUTES))
                .endTime(Instant.now().plus(20, ChronoUnit.MINUTES))
                .build());
        space.setReserved(true);
        spaces.save(space);

        int expired = lifecycleJob.sweep();

        assertThat(expired).isEqualTo(1);
        assertThat(reservations.findById(noShow.getId()).orElseThrow().getStatus()).isEqualTo(ReservationStatus.EXPIRED);
        assertThat(spaces.findById(space.getId()).orElseThrow().isReserved()).isFalse();
    }

    @Test
    void theSweepHoldsSpacesForBookingsAboutToStart() {
        reservations.save(Reservation.builder()
                .code("RES-SOON0001")
                .user(driver)
                .vehicle(car)
                .zone(zone)
                .assignedSpace(space)
                .status(ReservationStatus.CONFIRMED)
                .startTime(Instant.now().plus(10, ChronoUnit.MINUTES))
                .endTime(Instant.now().plus(70, ChronoUnit.MINUTES))
                .build());

        lifecycleJob.sweep();

        assertThat(spaces.findById(space.getId()).orElseThrow().getStatus()).isEqualTo(SpaceStatus.RESERVED);
    }

    @Test
    void editingASiteWithoutOptionalFieldsKeepsTheirValues() {
        asUser(manager);
        siteService.update(paidSite.getId(), new ParkingSiteRequest(
                organization.getId(), "Renamed", paidSite.getCode(), null, null, null, null,
                null, null, null, null, null, null, null));

        ParkingSite reloaded = sites.findById(paidSite.getId()).orElseThrow();
        assertThat(reloaded.getName()).isEqualTo("Renamed");
        assertThat(reloaded.getHourlyRate()).isEqualByComparingTo("40");
        assertThat(reloaded.getCategory()).isEqualTo(PlaceCategory.MALL);
        assertThat(reloaded.getCoverImageUrl()).isEqualTo("/places/test.jpg");
    }
}
