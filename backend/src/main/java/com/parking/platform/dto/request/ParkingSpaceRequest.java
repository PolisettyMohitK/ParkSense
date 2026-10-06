package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.VerificationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ParkingSpaceRequest(
        @NotNull Long zoneId,
        @Size(max = 50) String code,
        OperationalState operationalState,
        VerificationStatus verificationStatus,
        Double positionX,
        Double positionY,
        String polygon,
        @Size(max = 255) String label,
        Boolean active
) {
}
