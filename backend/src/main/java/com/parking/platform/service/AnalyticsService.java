package com.parking.platform.service;

import com.parking.platform.dto.response.AnalyticsSummary;
import com.parking.platform.dto.response.HeatmapCell;
import com.parking.platform.dto.response.UtilizationPoint;
import com.parking.platform.entity.OccupancyEvent;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.ReservationStatus;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.repository.MonitoringDeviceRepository;
import com.parking.platform.repository.OccupancyEventRepository;
import com.parking.platform.repository.ParkingSessionRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.config.BookingProperties;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.service.SpaceStatsService.Counts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
    private final SpaceStatsService statsService;
    private final BookingProperties properties;
    private final OccupancyEventRepository eventRepository;
    private final ReservationRepository reservationRepository;
    private final ParkingSessionRepository sessionRepository;
    private final MonitoringDeviceRepository deviceRepository;

    @Transactional(readOnly = true)
    public AnalyticsSummary summary() {
        List<Long> zoneIds = zoneRepository.findAll().stream().map(ParkingZone::getId).toList();
        Counts counts = SpaceStatsService.sum(statsService.forZones(zoneIds).values());
        long activeReservations = reservationRepository.countByStatusIn(
                List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED, ReservationStatus.ACTIVE));
        Double average = sessionRepository.averageCompletedDurationMinutes();
        return new AnalyticsSummary(
                zoneIds.size(), counts.total(), counts.occupied(), counts.available(), counts.reserved(),
                counts.outOfService(), counts.occupancyRate(),
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
            Instant bucket = event.getOccurredAt().atZone(properties.timezone())
                    .truncatedTo(ChronoUnit.HOURS).toInstant();
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
            var zoned = event.getOccurredAt().atZone(properties.timezone());
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
        // Default to the last 30 days rather than scanning the whole event history.
        Instant start = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant end = to != null ? to : Instant.now();
        return zoneId == null
                ? eventRepository.findAllByOccurredAtBetween(start, end)
                : eventRepository.findAllByZoneAndPeriod(zoneId, start, end);
    }
}
