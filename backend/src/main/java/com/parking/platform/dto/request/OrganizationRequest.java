package com.parking.platform.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrganizationRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) String code,
        @Email @Size(max = 150) String contactEmail,
        @Size(max = 30) String contactPhone,
        @Size(max = 255) String address,
        Boolean active
) {
}
