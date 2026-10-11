package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.ReservationStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record ReservationResponse(
        Long id,
        String code,
        Long userId,
        String userName,
        Long vehicleId,
        String plateNumber,
        Long zoneId,
        String zoneName,
        Long assignedSpaceId,
        String assignedSpaceCode,
        ReservationStatus status,
        Instant startTime,
        Instant endTime,
        Long siteId,
        String siteName,
        BigDecimal estimatedAmount,
        Instant createdAt
) {
}
