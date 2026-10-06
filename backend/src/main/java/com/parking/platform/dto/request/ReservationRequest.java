package com.parking.platform.dto.request;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record ReservationRequest(
        @NotNull Long userId,
        @NotNull Long vehicleId,
        @NotNull Long zoneId,
        Long assignedSpaceId,
        @NotNull Instant startTime,
        @NotNull Instant endTime
) {
}
