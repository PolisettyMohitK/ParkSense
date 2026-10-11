package com.parking.platform.service;

import com.parking.platform.config.BookingProperties;
import com.parking.platform.dto.response.MySessionResponse;
import com.parking.platform.dto.response.ParkingSessionResponse;
import com.parking.platform.entity.ParkingSession;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.PaymentMethod;
import com.parking.platform.entity.enums.PaymentStatus;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ParkingSessionMapper;
import com.parking.platform.repository.ParkingSessionRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.security.SecurityUtils;
import com.parking.platform.util.CodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ParkingSessionService {

    private static final List<ReservationStatus> LINKABLE_RESERVATION_STATUSES =
            List.of(ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE);

    private final ParkingSessionRepository repository;
    private final ReservationRepository reservationRepository;
    private final ParkingSessionMapper mapper;
    private final PricingService pricingService;
    private final SpaceHoldService holdService;
    private final BookingProperties properties;
    private final Clock clock;

    /**
     * Opens a stay when a space becomes occupied. It is attributed to a reservation only if that
     * booking's window is open at {@code at} (with the arrival grace); otherwise it is a walk-in with
     * no driver attached - the staff member or device that reported it is recorded on the event.
     */
    @Transactional
    public ParkingSession checkIn(ParkingSpace space, EventSource source, Instant at) {
        Optional<ParkingSession> existing =
                repository.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(space.getId(), SessionStatus.ACTIVE);
        if (existing.isPresent()) {
            return existing.get();
        }

        Reservation reservation = reservationRepository
                .findLinkableForSpace(space.getId(), at, at.plus(properties.arrivalGrace()), LINKABLE_RESERVATION_STATUSES)
                .stream()
                .findFirst()
                .orElse(null);

        if (reservation != null && reservation.getStatus() == ReservationStatus.CONFIRMED) {
            reservation.setStatus(ReservationStatus.ACTIVE);
            reservationRepository.save(reservation);
        }

        ParkingSession session = ParkingSession.builder()
                .code(CodeGenerator.sessionCode())
                .space(space)
                .source(source)
                .status(SessionStatus.ACTIVE)
                .checkInAt(at)
                .reservation(reservation)
                .vehicle(reservation != null ? reservation.getVehicle() : null)
                .user(reservation != null ? reservation.getUser() : null)
                .build();
        ParkingSession saved = repository.save(session);
        holdService.refresh(space);
        return saved;
    }

    /** Closes the stay on a space, prices it, and completes any linked reservation. */
    @Transactional
    public ParkingSession checkOut(ParkingSpace space, Instant at) {
        Optional<ParkingSession> active =
                repository.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(space.getId(), SessionStatus.ACTIVE);
        if (active.isEmpty()) {
            return null;
        }

        ParkingSession session = active.get();
        Instant checkOutAt = at.isBefore(session.getCheckInAt()) ? session.getCheckInAt() : at;
        Duration stayed = Duration.between(session.getCheckInAt(), checkOutAt);
        session.setStatus(SessionStatus.COMPLETED);
        session.setCheckOutAt(checkOutAt);
        session.setDurationMinutes(stayed.toMinutes());

        Reservation reservation = session.getReservation();
        // Bookings pay for the slot they held; overstays are charged for the extra time too.
        Duration billed = stayed;
        if (reservation != null) {
            Duration booked = Duration.between(reservation.getStartTime(), reservation.getEndTime());
            billed = booked.compareTo(stayed) > 0 ? booked : stayed;
            if (reservation.getStatus() == ReservationStatus.ACTIVE
                    || reservation.getStatus() == ReservationStatus.CONFIRMED) {
                reservation.setStatus(ReservationStatus.COMPLETED);
                reservationRepository.save(reservation);
            }
        }
        BigDecimal amount = pricingService.price(pricingService.rateFor(space), billed);
        session.setAmount(amount);
        session.setPaymentStatus(amount.signum() > 0 ? PaymentStatus.PENDING : PaymentStatus.NOT_REQUIRED);

        ParkingSession saved = repository.save(session);
        holdService.refresh(space);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ParkingSessionResponse> findAll(SessionStatus status, Long spaceId) {
        List<ParkingSession> sessions;
        if (spaceId != null) {
            sessions = repository.findAllBySpaceIdOrderByCheckInAtDesc(spaceId);
            if (status != null) {
                sessions = sessions.stream().filter(session -> session.getStatus() == status).toList();
            }
        } else if (status != null) {
            sessions = repository.findAllByStatusOrderByCheckInAtDesc(status);
        } else {
            sessions = repository.findAllByOrderByCheckInAtDesc();
        }
        return sessions.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ParkingSessionResponse> findByUser(Long userId) {
        return repository.findAllByUserIdOrderByCheckInAtDesc(userId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ParkingSessionResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public ParkingSessionResponse activeForSpace(Long spaceId) {
        return repository.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(spaceId, SessionStatus.ACTIVE)
                .map(mapper::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MySessionResponse> findMySessions() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return List.of();
        }
        return repository.findAllByUserIdOrderByCheckInAtDesc(userId).stream()
                .map(this::toMySessionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<MySessionResponse> findMyActiveSession() {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            return Optional.empty();
        }
        return repository.findFirstByUserIdAndStatusOrderByCheckInAtDesc(userId, SessionStatus.ACTIVE)
                .map(this::toMySessionResponse);
    }

    @Transactional(readOnly = true)
    public MySessionResponse findMySession(Long id) {
        return toMySessionResponse(getOwnedSession(id));
    }

    /** Driver settles their own completed stay (simulated - no gateway is called). */
    @Transactional
    public MySessionResponse payMine(Long id, PaymentMethod method) {
        ParkingSession session = getOwnedSession(id);
        settle(session, method);
        return toMySessionResponse(session);
    }

    /** Staff records an offline payment (e.g. cash at the gate) for any stay. */
    @Transactional
    public ParkingSessionResponse recordPayment(Long id, PaymentMethod method) {
        ParkingSession session = getEntity(id);
        settle(session, method);
        return mapper.toResponse(session);
    }

    @Transactional(readOnly = true)
    public Optional<MySessionResponse> findForReservation(Long reservationId) {
        return repository.findFirstByReservationIdOrderByCheckInAtDesc(reservationId).map(this::toMySessionResponse);
    }

    private void settle(ParkingSession session, PaymentMethod method) {
        if (session.getStatus() != SessionStatus.COMPLETED) {
            throw new BadRequestException("Payment is taken after check-out");
        }
        if (session.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("This stay is already paid (" + session.getPaymentRef() + ")");
        }
        if (session.getPaymentStatus() != PaymentStatus.PENDING) {
            throw new BadRequestException("Nothing to pay - parking here is complimentary");
        }
        session.setPaymentStatus(PaymentStatus.PAID);
        session.setPaymentMethod(method);
        session.setPaymentRef(CodeGenerator.paymentRef());
        session.setPaidAt(Instant.now(clock));
        repository.save(session);
    }

    private ParkingSession getOwnedSession(Long id) {
        ParkingSession session = getEntity(id);
        Long userId = SecurityUtils.currentUserId();
        if (userId == null || session.getUser() == null || !session.getUser().getId().equals(userId)) {
            throw new AccessDeniedException("You can only access your own parking sessions");
        }
        return session;
    }

    private MySessionResponse toMySessionResponse(ParkingSession session) {
        ParkingSpace space = session.getSpace();
        ParkingZone zone = space != null ? space.getZone() : null;
        ParkingSite site = zone != null ? zone.getSite() : null;
        Vehicle vehicle = session.getVehicle();
        Reservation reservation = session.getReservation();
        BigDecimal rate = pricingService.rateFor(zone);
        BigDecimal amount = session.getAmount();
        if (session.getStatus() == SessionStatus.ACTIVE) {
            amount = pricingService.price(rate, Duration.between(session.getCheckInAt(), Instant.now(clock)));
        }
        return new MySessionResponse(
                session.getId(),
                session.getCode(),
                space != null ? space.getId() : null,
                space != null ? space.getCode() : null,
                zone != null ? zone.getId() : null,
                zone != null ? zone.getName() : null,
                site != null ? site.getId() : null,
                site != null ? site.getName() : null,
                vehicle != null ? vehicle.getId() : null,
                vehicle != null ? vehicle.getPlateNumber() : null,
                reservation != null ? reservation.getId() : null,
                reservation != null ? reservation.getCode() : null,
                session.getStatus(),
                session.getCheckInAt(),
                session.getCheckOutAt(),
                session.getDurationMinutes(),
                PricingService.isComplimentary(rate) ? BigDecimal.ZERO : rate,
                amount,
                pricingService.currency(),
                session.getPaymentStatus(),
                session.getPaymentMethod(),
                session.getPaymentRef(),
                session.getPaidAt()
        );
    }

    public ParkingSession getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("ParkingSession", id));
    }
}
