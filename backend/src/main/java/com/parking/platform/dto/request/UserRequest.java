package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserRequest(
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Email @Size(max = 180) String email,
        @Size(min = 6, max = 100) String password,
        Role role,
        @Size(max = 30) String phone,
        Boolean enabled,
        Long organizationId
) {
}
