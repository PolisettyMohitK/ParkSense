package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.ZoneType;

import java.time.Instant;

public record ParkingZoneResponse(
        Long id,
        Long siteId,
        String siteName,
        String name,
        String code,
        ZoneType type,
        String floor,
        Integer capacity,
        String mapImageUrl,
        String description,
        boolean active,
        long totalSpaces,
        long occupiedSpaces,
        long availableSpaces,
        Instant createdAt
) {
}
