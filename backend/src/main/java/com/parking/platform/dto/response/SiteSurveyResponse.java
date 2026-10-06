package com.parking.platform.dto.response;

import java.time.Instant;

public record SiteSurveyResponse(
        Long id,
        Long siteId,
        String siteName,
        String surveyJobId,
        String profile,
        String status,
        boolean imported,
        Integer importedSpaceCount,
        Instant importedAt,
        String layoutJson,
        String reportJson,
        Instant createdAt
) {
}
