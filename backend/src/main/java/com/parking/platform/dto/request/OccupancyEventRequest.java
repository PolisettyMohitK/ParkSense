package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record OccupancyEventRequest(
        @NotNull Long spaceId,
        @NotNull OccupancyState state,
        @NotNull EventSource source,
        @DecimalMin("0.0") @DecimalMax("1.0") Double confidence,
        Long actorUserId,
        Long deviceId,
        @Size(max = 120) String externalId,
        @Size(max = 255) String note,
        Instant occurredAt
) {
}
