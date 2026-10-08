package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.SpaceStatus;

/**
 * Public space representation for drivers and drawing:
 * strictly omits internal identifiers, device assignments,
 * verification details, and event logs.
 */
public record PublicSpaceResponse(
        Long id,
        String code,
        String label,
        SpaceStatus status,
        Double positionX,
        Double positionY,
        String polygon
) {
}
