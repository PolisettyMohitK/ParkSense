package com.parking.platform.service;

import com.parking.platform.config.BookingProperties;
import com.parking.platform.dto.request.OccupancyEventRequest;
import com.parking.platform.dto.request.ReservationRequest;
import com.parking.platform.dto.response.MySessionResponse;
import com.parking.platform.dto.response.ReservationResponse;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ReservationMapper;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.security.SecurityUtils;
import com.parking.platform.util.CodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {

    /** Statuses that occupy a space's calendar. */
    static final List<ReservationStatus> BLOCKING_STATUSES =
            List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE);

    private static final int MAX_CANDIDATES = 10;

    private final ReservationRepository repository;
    private final ParkingSpaceRepository spaceRepository;
    private final UserService userService;
    private final VehicleService vehicleService;
    private final ParkingZoneService zoneService;
    private final ParkingSpaceService spaceService;
    private final OccupancyService occupancyService;
    private final ParkingSessionService sessionService;
    private final PricingService pricingService;
    private final SpaceHoldService holdService;
    private final ReservationMapper mapper;
    private final BookingProperties properties;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<ReservationResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> findByUser(Long userId) {
        return repository.findAllByUserId(userId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse findById(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        return mapper.toResponse(reservation);
    }

    /**
     * Books a space. READ_COMMITTED so the overlap re-check after taking the space row lock sees
     * bookings committed by a competing request that held the lock first.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ReservationResponse create(ReservationRequest request) {
        Instant now = Instant.now(clock);
        validateWindow(request.startTime(), request.endTime(), now);

        Long userId = SecurityUtils.isAdminOrManager() && request.userId() != null
                ? request.userId()
                : SecurityUtils.currentUserId();
        if (userId == null) {
            throw new AccessDeniedException("Cannot determine reservation owner");
        }
        User user = userService.getEntity(userId);
        Vehicle vehicle = vehicleService.getEntity(request.vehicleId());
        if (vehicle.getOwner() == null || !vehicle.getOwner().getId().equals(userId)) {
            throw new AccessDeniedException(SecurityUtils.isAdminOrManager()
                    ? "The vehicle does not belong to the selected driver"
                    : "You can only reserve with your own vehicle");
        }
        if (!vehicle.isActive()) {
            throw new BadRequestException("This vehicle has been removed from your account");
        }
        if (!repository.findOverlappingForVehicle(
                vehicle.getId(), request.startTime(), request.endTime(), BLOCKING_STATUSES).isEmpty()) {
            throw new ConflictException("Vehicle " + vehicle.getPlateNumber() + " already has a booking in that period");
        }

        ParkingZone zone = zoneService.getEntity(request.zoneId());
        if (!zone.isActive() || zone.getSite() == null || !zone.getSite().isActive()) {
            throw new BadRequestException("This parking area is not accepting bookings");
        }

        boolean startsNow = holdService.startsWithinHold(request.startTime());
        ParkingSpace space = request.assignedSpaceId() != null
                ? claimRequestedSpace(request, zone, startsNow)
                : claimAnySpace(request, zone, startsNow);

        Reservation reservation = Reservation.builder()
                .code(CodeGenerator.reservationCode())
                .user(user)
                .vehicle(vehicle)
                .zone(zone)
                .assignedSpace(space)
                .status(ReservationStatus.CONFIRMED)
                .startTime(request.startTime())
                .endTime(request.endTime())
                .estimatedAmount(pricingService.price(
                        pricingService.rateFor(zone), Duration.between(request.startTime(), request.endTime())))
                .build();
        Reservation saved = repository.save(reservation);
        holdService.refresh(space);
        return mapper.toResponse(saved);
    }

    @Transactional
    public ReservationResponse cancel(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        if (reservation.getStatus() == ReservationStatus.ACTIVE) {
            throw new BadRequestException("You are checked in - check out instead of cancelling");
        }
        ensureOpen(reservation);
        reservation.setStatus(ReservationStatus.CANCELLED);
        repository.save(reservation);
        holdService.refresh(reservation.getAssignedSpace());
        return mapper.toResponse(reservation);
    }

    /** Staff override to close a booking without a recorded stay. */
    @Transactional
    public ReservationResponse complete(Long id) {
        if (!SecurityUtils.isAdminOrManager()) {
            throw new AccessDeniedException("Only staff can complete a reservation manually");
        }
        Reservation reservation = getEntity(id);
        ensureOpen(reservation);
        ParkingSpace space = reservation.getAssignedSpace();
        if (reservation.getStatus() == ReservationStatus.ACTIVE && space != null
                && space.getOccupancyState() == OccupancyState.OCCUPIED) {
            // Close the stay through the normal pipeline so it is priced and broadcast.
            recordOccupancy(reservation, OccupancyState.VACANT, "staff-complete");
            return mapper.toResponse(getEntity(id));
        }
        reservation.setStatus(ReservationStatus.COMPLETED);
        repository.save(reservation);
        holdService.refresh(space);
        return mapper.toResponse(reservation);
    }

    /** Driver arrives and checks in from the app (QR / self-service). */
    @Transactional
    public ReservationResponse checkIn(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new BadRequestException("Only a confirmed booking can be checked in (status is "
                    + reservation.getStatus() + ")");
        }
        Instant now = Instant.now(clock);
        if (now.isBefore(reservation.getStartTime().minus(properties.arrivalGrace()))) {
            throw new BadRequestException("Too early - check-in opens "
                    + properties.arrivalGrace().toMinutes() + " minutes before your booking starts");
        }
        if (!now.isBefore(reservation.getEndTime())) {
            throw new BadRequestException("This booking has already ended");
        }
        ParkingSpace space = reservation.getAssignedSpace();
        if (space == null) {
            throw new ConflictException("No space is assigned to this booking - please contact staff");
        }
        if (space.getOccupancyState() == OccupancyState.OCCUPIED) {
            throw new ConflictException("Space " + space.getCode() + " is still occupied - please contact staff");
        }
        recordOccupancy(reservation, OccupancyState.OCCUPIED, "in");
        Reservation refreshed = getEntity(id);
        if (refreshed.getStatus() != ReservationStatus.ACTIVE) {
            // The session pipeline links the earliest open booking on the space; make sure it was this one.
            throw new ConflictException("Could not attach the check-in to this booking - please contact staff");
        }
        return mapper.toResponse(refreshed);
    }

    /** Driver leaves; closes the stay and returns it with the final charge. */
    @Transactional
    public MySessionResponse checkOut(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        if (reservation.getStatus() != ReservationStatus.ACTIVE) {
            throw new BadRequestException("You are not checked in for this booking");
        }
        recordOccupancy(reservation, OccupancyState.VACANT, "out");
        return sessionService.findForReservation(id)
                .orElseThrow(() -> new ConflictException("No parking session found for this booking"));
    }

    @Transactional
    public void delete(Long id) {
        Reservation reservation = getEntity(id);
        assertCanManage(reservation);
        if (reservation.getStatus() == ReservationStatus.ACTIVE) {
            throw new BadRequestException("Check the vehicle out before deleting an active booking");
        }
        if (sessionService.findForReservation(id).isPresent()) {
            throw new ConflictException("This booking has a parking session on record and cannot be deleted");
        }
        ParkingSpace space = reservation.getAssignedSpace();
        repository.delete(reservation);
        repository.flush();
        holdService.refresh(space);
    }

    public Reservation getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Reservation", id));
    }

    private void recordOccupancy(Reservation reservation, OccupancyState state, String suffix) {
        occupancyService.recordEvent(new OccupancyEventRequest(
                reservation.getAssignedSpace().getId(),
                state,
                EventSource.QR,
                1.0,
                null,
                null,
                reservation.getCode() + "-" + suffix,
                "Self check-" + (state == OccupancyState.OCCUPIED ? "in" : "out") + " for " + reservation.getCode(),
                Instant.now(clock)));
    }

    private void validateWindow(Instant start, Instant end, Instant now) {
        if (!end.isAfter(start)) {
            throw new BadRequestException("End time must be after start time");
        }
        if (start.isBefore(now.minus(properties.pastTolerance()))) {
            throw new BadRequestException("Start time cannot be in the past");
        }
        if (Duration.between(start, end).compareTo(properties.maxDuration()) > 0) {
            throw new BadRequestException("A booking can last at most " + properties.maxDuration().toHours() + " hours");
        }
        if (start.isAfter(now.plus(properties.maxAdvance()))) {
            throw new BadRequestException("Bookings open " + properties.maxAdvance().toDays() + " days in advance");
        }
    }

    private ParkingSpace claimRequestedSpace(ReservationRequest request, ParkingZone zone, boolean startsNow) {
        ParkingSpace space = spaceRepository.findByIdForUpdate(request.assignedSpaceId())
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSpace", request.assignedSpaceId()));
        if (space.getZone() == null || !space.getZone().getId().equals(zone.getId())) {
            throw new BadRequestException("Assigned space does not belong to the requested zone");
        }
        if (!space.isActive() || space.getVerificationStatus() != VerificationStatus.VERIFIED) {
            throw new ConflictException("Space " + space.getCode() + " is not open for bookings");
        }
        if (space.getOperationalState() != OperationalState.IN_SERVICE) {
            throw new ConflictException("Space " + space.getCode() + " is out of service");
        }
        if (startsNow && space.getOccupancyState() == OccupancyState.OCCUPIED) {
            throw new ConflictException("Space " + space.getCode() + " is occupied right now - pick another one");
        }
        if (isTaken(space, request)) {
            throw new ConflictException("Space " + space.getCode() + " is already booked for that period");
        }
        return space;
    }

    private ParkingSpace claimAnySpace(ReservationRequest request, ParkingZone zone, boolean startsNow) {
        List<ParkingSpace> candidates = spaceRepository.findBookable(
                zone.getId(), request.startTime(), request.endTime(), BLOCKING_STATUSES, startsNow);
        for (ParkingSpace candidate : candidates.subList(0, Math.min(MAX_CANDIDATES, candidates.size()))) {
            ParkingSpace locked = spaceRepository.findByIdForUpdate(candidate.getId()).orElse(null);
            if (locked != null && !isTaken(locked, request)
                    && !(startsNow && locked.getOccupancyState() == OccupancyState.OCCUPIED)) {
                return locked;
            }
        }
        throw new ConflictException("No space is available in " + zone.getName() + " for that period");
    }

    private boolean isTaken(ParkingSpace space, ReservationRequest request) {
        return !repository.findOverlappingForSpace(
                space.getId(), request.startTime(), request.endTime(), BLOCKING_STATUSES).isEmpty();
    }

    private void assertCanManage(Reservation reservation) {
        if (SecurityUtils.isAdminOrManager()) {
            return;
        }
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null || reservation.getUser() == null
                || !reservation.getUser().getId().equals(currentUserId)) {
            throw new AccessDeniedException("You can only manage your own reservations");
        }
    }

    private void ensureOpen(Reservation reservation) {
        if (reservation.getStatus() == ReservationStatus.CANCELLED
                || reservation.getStatus() == ReservationStatus.COMPLETED
                || reservation.getStatus() == ReservationStatus.EXPIRED) {
            throw new BadRequestException("Reservation is already " + reservation.getStatus());
        }
    }
}
