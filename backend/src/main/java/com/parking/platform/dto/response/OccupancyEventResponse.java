package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;

import java.time.Instant;

public record OccupancyEventResponse(
        Long id,
        Long spaceId,
        String spaceCode,
        Long zoneId,
        String zoneName,
        OccupancyState state,
        EventSource source,
        Double confidence,
        Long actorUserId,
        String actorName,
        Long deviceId,
        String deviceName,
        String externalId,
        String note,
        Instant occurredAt,
        Instant createdAt
) {
}
