package com.parking.platform.dto.response;

import java.time.Instant;

public record UtilizationPoint(
        Instant bucket,
        long occupiedEvents,
        long vacantEvents,
        long netEvents
) {
}
