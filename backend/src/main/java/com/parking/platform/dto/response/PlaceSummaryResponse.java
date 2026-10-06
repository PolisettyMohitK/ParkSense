package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.PlaceCategory;

import java.math.BigDecimal;
import java.util.List;

public record PlaceSummaryResponse(
        Long siteId,
        String name,
        String organizationName,
        PlaceCategory category,
        String address,
        String city,
        Double latitude,
        Double longitude,
        Double distanceKm,
        String coverImageUrl,
        BigDecimal hourlyRate,
        String openingHours,
        List<String> amenities,
        int zoneCount,
        long totalSpaces,
        long availableSpaces,
        long occupiedSpaces
) {
}
