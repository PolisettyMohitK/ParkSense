package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.ZoneType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ParkingZoneRequest(
        @NotNull Long siteId,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) String code,
        ZoneType type,
        @Size(max = 50) String floor,
        @Positive @Max(10000) Integer capacity,
        @Size(max = 500) String mapImageUrl,
        @Size(max = 2000) String description,
        Boolean active
) {
}
