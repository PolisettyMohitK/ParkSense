package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.SessionStatus;

import java.time.Instant;

public record MySessionResponse(
        Long id,
        String code,
        Long spaceId,
        String spaceCode,
        Long zoneId,
        String zoneName,
        Long vehicleId,
        String plateNumber,
        SessionStatus status,
        Instant checkInAt,
        Instant checkOutAt,
        Long durationMinutes
) {
}
