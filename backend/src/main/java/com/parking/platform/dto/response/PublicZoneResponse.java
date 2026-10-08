package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.ZoneType;

public record PublicZoneResponse(
        Long id,
        Long siteId,
        String name,
        String code,
        ZoneType type,
        String floor,
        String description,
        long totalSpaces,
        long occupiedSpaces,
        long availableSpaces,
        long reservedSpaces
) {
}
