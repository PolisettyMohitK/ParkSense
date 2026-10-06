package com.parking.platform.dto.response;

public record ZoneOccupancyResponse(
        Long zoneId,
        String zoneName,
        String zoneCode,
        long totalSpaces,
        long occupied,
        long available,
        long reserved,
        long outOfService,
        double occupancyRate
) {
}
