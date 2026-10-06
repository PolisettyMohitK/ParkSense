package com.parking.platform.dto.response;

public record AnalyticsSummary(
        long zones,
        long spaces,
        long occupied,
        long available,
        long reserved,
        long outOfService,
        double utilizationRate,
        long occupancyEvents,
        long activeReservations,
        long activeSessions,
        double averageSessionMinutes,
        long devices
) {
}
