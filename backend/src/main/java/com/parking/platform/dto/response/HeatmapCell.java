package com.parking.platform.dto.response;

public record HeatmapCell(
        int dayOfWeek,
        int hour,
        long events
) {
}
