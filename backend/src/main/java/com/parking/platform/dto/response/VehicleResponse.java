package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.VehicleType;

import java.time.Instant;

public record VehicleResponse(
        Long id,
        Long ownerId,
        String ownerName,
        String plateNumber,
        String make,
        String model,
        String color,
        VehicleType type,
        boolean active,
        Instant createdAt
) {
}
