package com.parking.platform.service;

import com.parking.platform.config.BookingProperties;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.Reservation;
import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.event.OccupancyChangedEvent;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Housekeeping for bookings, run every minute:
 * <ul>
 *   <li>confirmed bookings nobody arrived for (start + grace passed) become EXPIRED and free their space;</li>
 *   <li>spaces are held (RESERVED) shortly before a booking starts, and released when no booking holds them.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
public class ReservationLifecycleJob {

    private static final Logger log = LoggerFactory.getLogger(ReservationLifecycleJob.class);

    private final ReservationRepository reservationRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final SpaceHoldService holdService;
    private final BookingProperties properties;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Scheduled(fixedDelayString = "${app.booking.sweep-interval-ms:60000}", initialDelay = 15000)
    public void scheduledSweep() {
        try {
            sweep();
        } catch (RuntimeException ex) {
            log.warn("Reservation sweep failed: {}", ex.getMessage());
        }
    }

    /** @return number of bookings expired */
    @Transactional
    public int sweep() {
        Instant now = Instant.now(clock);
        Map<Long, ParkingSpace> touched = new LinkedHashMap<>();

        int expired = 0;
        for (Reservation reservation : reservationRepository.findAllByStatusAndStartTimeBefore(
                ReservationStatus.CONFIRMED, now.minus(properties.arrivalGrace()))) {
            reservation.setStatus(ReservationStatus.EXPIRED);
            reservationRepository.save(reservation);
            expired++;
            if (reservation.getAssignedSpace() != null) {
                touched.put(reservation.getAssignedSpace().getId(), reservation.getAssignedSpace());
            }
        }

        for (Reservation upcoming : reservationRepository.findAllByStatusAndStartTimeLessThanEqualAndEndTimeAfter(
                ReservationStatus.CONFIRMED, now.plus(properties.holdBefore()), now)) {
            if (upcoming.getAssignedSpace() != null) {
                touched.put(upcoming.getAssignedSpace().getId(), upcoming.getAssignedSpace());
            }
        }
        for (ParkingSpace held : spaceRepository.findAllByReservedTrue()) {
            touched.putIfAbsent(held.getId(), held);
        }

        for (ParkingSpace space : touched.values()) {
            if (holdService.refresh(space)) {
                eventPublisher.publishEvent(new OccupancyChangedEvent(
                        space.getId(), space.getCode(), space.getZone().getId(), space.getZone().getName(),
                        space.getOccupancyState(), EventSource.MANUAL, now));
            }
        }
        if (expired > 0) {
            log.info("Expired {} no-show reservation(s)", expired);
        }
        return expired;
    }
}
