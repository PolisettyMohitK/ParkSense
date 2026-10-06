package com.parking.platform.dto.response;

import java.time.Instant;

public record OrganizationResponse(
        Long id,
        String name,
        String code,
        String contactEmail,
        String contactPhone,
        String address,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {
}
