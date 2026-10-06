package com.parking.platform.service;

import com.parking.platform.dto.response.ParkingSessionResponse;
import com.parking.platform.entity.ParkingSession;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ParkingSessionMapper;
import com.parking.platform.repository.ParkingSessionRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.util.CodeGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public ParkingSession checkIn(ParkingSpace space, EventSource source, Instant at, User actor) {
        Optional<ParkingSession> existing =
                repository.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(space.getId(), SessionStatus.ACTIVE);
        if (existing.isPresent()) {
            return existing.get();
        }

        Reservation reservation = reservationRepository
                .findFirstByAssignedSpaceIdAndStatusInAndEndTimeAfter(space.getId(), LINKABLE_RESERVATION_STATUSES, at)
                .orElse(null);

        if (reservation != null && reservation.getStatus() == ReservationStatus.CONFIRMED) {
            reservation.setStatus(ReservationStatus.ACTIVE);
        }
        if (reservation != null) {
            space.setReserved(true);
        }

        ParkingSession session = ParkingSession.builder()
                .code(CodeGenerator.sessionCode())
                .space(space)
                .source(source)
                .status(SessionStatus.ACTIVE)
                .checkInAt(at)
                .reservation(reservation)
                .vehicle(reservation != null ? reservation.getVehicle() : null)
                .user(reservation != null ? reservation.getUser() : actor)
                .build();
        return repository.save(session);
    }

    @Transactional
    public ParkingSession checkOut(ParkingSpace space, Instant at) {
        Optional<ParkingSession> active =
                repository.findFirstBySpaceIdAndStatusOrderByCheckInAtDesc(space.getId(), SessionStatus.ACTIVE);
        if (active.isEmpty()) {
            return null;
        }

        ParkingSession session = active.get();
        session.setStatus(SessionStatus.COMPLETED);
        session.setCheckOutAt(at);
        session.setDurationMinutes(Math.max(0L, Duration.between(session.getCheckInAt(), at).toMinutes()));

        Reservation reservation = session.getReservation();
        if (reservation != null) {
            if (reservation.getStatus() == ReservationStatus.ACTIVE
                    || reservation.getStatus() == ReservationStatus.CONFIRMED) {
                reservation.setStatus(ReservationStatus.COMPLETED);
            }
            space.setReserved(false);
        }
        return repository.save(session);
    }

    @Transactional(readOnly = true)
    public List<ParkingSessionResponse> findAll(SessionStatus status, Long spaceId) {
        List<ParkingSession> sessions;
        if (spaceId != null) {
            sessions = repository.findAllBySpaceIdOrderByCheckInAtDesc(spaceId);
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

    public ParkingSession getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("ParkingSession", id));
    }
}
