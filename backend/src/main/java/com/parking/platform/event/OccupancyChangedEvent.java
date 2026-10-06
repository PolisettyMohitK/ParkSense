package com.parking.platform.event;

import com.parking.platform.entity.enums.EventSource;
import com.parking.platform.entity.enums.OccupancyState;

import java.time.Instant;

public record OccupancyChangedEvent(
        Long spaceId,
        String spaceCode,
        Long zoneId,
        String zoneName,
        OccupancyState state,
        EventSource source,
        Instant occurredAt
) {
}
