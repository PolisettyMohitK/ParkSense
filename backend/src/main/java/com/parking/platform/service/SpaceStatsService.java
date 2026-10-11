package com.parking.platform.service;

import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ZoneSpaceCounts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Single source of truth for space availability numbers shown on dashboards, the zone list and the
 * driver marketplace. Counts only active, verified spaces; buckets are mutually exclusive.
 */
@Service
@RequiredArgsConstructor
public class SpaceStatsService {

    private final ParkingSpaceRepository spaceRepository;

    public record Counts(long total, long occupied, long reserved, long outOfService) {

        public static final Counts EMPTY = new Counts(0, 0, 0, 0);

        public long available() {
            return Math.max(0, total - occupied - reserved - outOfService);
        }

        public double occupancyRate() {
            return total == 0 ? 0d : (double) occupied / total;
        }

        public Counts plus(Counts other) {
            return new Counts(total + other.total, occupied + other.occupied,
                    reserved + other.reserved, outOfService + other.outOfService);
        }
    }

    @Transactional(readOnly = true)
    public Map<Long, Counts> forZones(Collection<Long> zoneIds) {
        Map<Long, Counts> result = new HashMap<>();
        if (zoneIds == null || zoneIds.isEmpty()) {
            return result;
        }
        for (ZoneSpaceCounts row : spaceRepository.countStatusByZone(zoneIds)) {
            result.put(row.getZoneId(), new Counts(
                    nz(row.getTotal()), nz(row.getOccupied()), nz(row.getReserved()), nz(row.getOutOfService())));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Counts forZone(Long zoneId) {
        return forZones(List.of(zoneId)).getOrDefault(zoneId, Counts.EMPTY);
    }

    public static Counts sum(Collection<Counts> counts) {
        return counts.stream().reduce(Counts.EMPTY, Counts::plus);
    }

    private static long nz(Long value) {
        return value == null ? 0 : value;
    }
}
