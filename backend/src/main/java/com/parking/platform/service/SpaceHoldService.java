package com.parking.platform.service;

import com.parking.platform.config.BookingProperties;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/**
 * Keeps {@link ParkingSpace#isReserved()} in sync with bookings. The flag means "held right now":
 * a checked-in booking, or a confirmed one starting within the hold window. Future bookings do not
 * block a space today - overlap checks on the reservation windows handle those.
 */
@Service
@RequiredArgsConstructor
public class SpaceHoldService {

    private final ReservationRepository reservationRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final BookingProperties properties;
    private final Clock clock;

    public boolean startsWithinHold(Instant start) {
        return !start.isAfter(Instant.now(clock).plus(properties.holdBefore()));
    }

    /** Recomputes the hold flag for a space; returns true if it changed. */
    @Transactional
    public boolean refresh(ParkingSpace space) {
        if (space == null) {
            return false;
        }
        Instant now = Instant.now(clock);
        boolean held = reservationRepository.isSpaceHeld(space.getId(), now, now.plus(properties.holdBefore()));
        if (held == space.isReserved()) {
            return false;
        }
        space.setReserved(held);
        spaceRepository.save(space);
        return true;
    }
}
