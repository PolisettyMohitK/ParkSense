package com.parking.platform.dto.request;

import com.parking.platform.entity.enums.PlaceCategory;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ParkingSiteRequest(
        @NotNull Long organizationId,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) String code,
        @Size(max = 255) String address,
        @Size(max = 100) String city,
        @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
        PlaceCategory category,
        @Size(max = 500) String description,
        @Size(max = 255) String coverImageUrl,
        @PositiveOrZero @Digits(integer = 6, fraction = 2) BigDecimal hourlyRate,
        @Size(max = 60) String openingHours,
        @Size(max = 255) String amenities,
        Boolean active
) {
}
