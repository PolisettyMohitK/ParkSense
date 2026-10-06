package com.parking.platform.dto.response;

import com.parking.platform.entity.enums.Role;

import java.time.Instant;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        String phone,
        boolean enabled,
        Long organizationId,
        String organizationName,
        Instant createdAt
) {
}
