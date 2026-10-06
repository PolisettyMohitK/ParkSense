package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.ZoneType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ParkingZoneRequest(
        @NotNull Long siteId,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) String code,
        ZoneType type,
        @Size(max = 50) String floor,
        Integer capacity,
        @Size(max = 500) String mapImageUrl,
        String description,
        Boolean active
) {
}
