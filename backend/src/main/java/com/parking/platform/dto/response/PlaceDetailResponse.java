package com.parking.platform.dto.response;

import java.util.List;

public record PlaceDetailResponse(
        PlaceSummaryResponse summary,
        String description,
        String contactEmail,
        String contactPhone,
        List<ParkingZoneResponse> zones
) {
}
