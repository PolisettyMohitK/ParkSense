package com.parking.platform.dto.response;

public record SurveyImportResponse(
        Long surveyId,
        Long zoneId,
        String zoneName,
        int spacesCreated
) {
}
