package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.PlaceCategory;

import java.math.BigDecimal;
import java.time.Instant;

public record ParkingSiteResponse(
        Long id,
        Long organizationId,
        String organizationName,
        String name,
        String code,
        String address,
        String city,
        Double latitude,
        Double longitude,
        PlaceCategory category,
        String description,
        String coverImageUrl,
        BigDecimal hourlyRate,
        String openingHours,
        String amenities,
        boolean active,
        Instant createdAt
) {
}
