package com.parking.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SiteSurveyRequest(
        @NotBlank @Size(max = 80) String surveyJobId,
        @Size(max = 20) String profile,
        @Size(max = 30) String status,
        @NotBlank @Size(max = 4_000_000) String layoutJson,
        @Size(max = 4_000_000) String reportJson
) {
}
