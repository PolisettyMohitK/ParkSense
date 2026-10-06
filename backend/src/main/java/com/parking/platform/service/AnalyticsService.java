package com.parking.platform.service;

import com.parking.platform.dto.response.AnalyticsSummary;
import com.parking.platform.dto.response.HeatmapCell;
import com.parking.platform.dto.response.UtilizationPoint;
import com.parking.platform.entity.OccupancyEvent;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.repository.MonitoringDeviceRepository;
import com.parking.platform.repository.OccupancyEventRepository;
import com.parking.platform.repository.ParkingSessionRepository;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final ParkingZoneRepository zoneRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final OccupancyEventRepository eventRepository;
    private final ReservationRepository reservationRepository;
    private final ParkingSessionRepository sessionRepository;
    private final MonitoringDeviceRepository deviceRepository;

    @Transactional(readOnly = true)
    public AnalyticsSummary summary() {
        long spaces = spaceRepository.count();
        long occupied = spaceRepository.countByOccupancyState(OccupancyState.OCCUPIED);
        long reserved = spaceRepository.countByReservedTrue();
        long outOfService = spaceRepository.countByOperationalStateNot(OperationalState.IN_SERVICE);
        long available = Math.max(0, spaces - occupied - reserved - outOfService);
        double rate = spaces == 0 ? 0d : (double) occupied / spaces;
        long activeReservations = reservationRepository.findAllByStatus(ReservationStatus.PENDING).size()
                + reservationRepository.findAllByStatus(ReservationStatus.CONFIRMED).size()
                + reservationRepository.findAllByStatus(ReservationStatus.ACTIVE).size();
        Double average = sessionRepository.averageCompletedDurationMinutes();
        return new AnalyticsSummary(
                zoneRepository.count(), spaces, occupied, available, reserved, outOfService, rate,
                eventRepository.count(), activeReservations,
                sessionRepository.countByStatus(SessionStatus.ACTIVE),
                average != null ? average : 0d,
                deviceRepository.count());
    }

    @Transactional(readOnly = true)
    public List<UtilizationPoint> utilization(Long zoneId, Instant from, Instant to) {
        List<OccupancyEvent> events = loadEvents(zoneId, from, to);
        Map<Instant, long[]> buckets = new TreeMap<>();
        for (OccupancyEvent event : events) {
            Instant bucket = event.getOccurredAt().truncatedTo(ChronoUnit.HOURS);
            long[] counters = buckets.computeIfAbsent(bucket, key -> new long[2]);
            if (event.getState() == OccupancyState.OCCUPIED) {
                counters[0]++;
            } else if (event.getState() == OccupancyState.VACANT) {
                counters[1]++;
            }
        }
        return buckets.entrySet().stream()
                .map(entry -> new UtilizationPoint(
                        entry.getKey(), entry.getValue()[0], entry.getValue()[1],
                        entry.getValue()[0] - entry.getValue()[1]))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<HeatmapCell> heatmap(Long zoneId, Instant from, Instant to) {
        Map<Long, Long> counts = new HashMap<>();
        for (OccupancyEvent event : loadEvents(zoneId, from, to)) {
            var zoned = event.getOccurredAt().atZone(ZoneOffset.UTC);
            long key = zoned.getDayOfWeek().getValue() * 100L + zoned.getHour();
            counts.merge(key, 1L, Long::sum);
        }
        List<HeatmapCell> cells = new ArrayList<>(7 * 24);
        for (int day = 1; day <= 7; day++) {
            for (int hour = 0; hour < 24; hour++) {
                cells.add(new HeatmapCell(day, hour, counts.getOrDefault(day * 100L + hour, 0L)));
            }
        }
        return cells;
    }

    private List<OccupancyEvent> loadEvents(Long zoneId, Instant from, Instant to) {
        Instant start = from != null ? from : Instant.EPOCH;
        Instant end = to != null ? to : Instant.now();
        return zoneId == null
                ? eventRepository.findAllByOccurredAtBetween(start, end)
                : eventRepository.findAllByZoneAndPeriod(zoneId, start, end);
    }
}
