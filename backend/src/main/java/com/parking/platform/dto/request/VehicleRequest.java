package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.VehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record VehicleRequest(
        @NotNull Long ownerId,
        @NotBlank @Size(max = 30) String plateNumber,
        @Size(max = 60) String make,
        @Size(max = 60) String model,
        @Size(max = 30) String color,
        VehicleType type,
        Boolean active
) {
}
