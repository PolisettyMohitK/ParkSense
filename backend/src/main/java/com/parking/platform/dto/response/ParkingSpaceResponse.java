package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.SpaceStatus;
import com.parking.platform.entity.enums.VerificationStatus;

import java.time.Instant;

public record ParkingSpaceResponse(
        Long id,
        Long zoneId,
        String zoneName,
        String code,
        SpaceStatus status,
        OccupancyState occupancyState,
        OperationalState operationalState,
        boolean reserved,
        VerificationStatus verificationStatus,
        Double positionX,
        Double positionY,
        String polygon,
        String label,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
