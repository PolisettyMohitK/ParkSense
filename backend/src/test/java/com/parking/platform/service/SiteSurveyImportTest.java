package com.parking.platform.service;

import com.parking.platform.dto.request.SiteSurveyRequest;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.support.BaseServiceTest;
import com.parking.platform.support.Fixtures;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Vision layout -> PROPOSED spaces, with guards for bad input and double import. */
class SiteSurveyImportTest extends BaseServiceTest {

    @Autowired private SiteSurveyService surveyService;

    private ParkingSite site;

    private static final String LAYOUT = """
            {
              "profile": "CAR",
              "orientation_deg": 90,
              "bays": [
                {"code": "A01", "polygon": [[0,0],[2.5,0],[2.5,5],[0,5]], "centre": [1.25,2.5], "areaM2": 12.5},
                {"code": "A02", "polygon": [[2.5,0],[5,0],[5,5],[2.5,5]], "centre": [3.75,2.5], "areaM2": 12.5}
              ],
              "aisles": []
            }
            """;

    @BeforeEach
    void setUp() {
        Organization organization = organizations.save(Fixtures.organization("SUR"));
        site = sites.save(Fixtures.site(organization, "SUR-S1", 12.97, 77.60,
                PlaceCategory.HOSPITAL, BigDecimal.valueOf(20)));
    }

    private Long storeSurvey(String layoutJson) {
        return surveyService.create(site.getId(), new SiteSurveyRequest(
                "survey-test-1", "CAR", "completed", layoutJson, "{\"confidence\":{\"grade\":\"high\"}}"))
                .id();
    }

    @Test
    void importingCreatesProposedSpacesWithGeometry() {
        zones.save(Fixtures.zone(site, "P1"));
        Long surveyId = storeSurvey(LAYOUT);

        var result = surveyService.importSpaces(site.getId(), surveyId);

        assertThat(result.spacesCreated()).isEqualTo(2);
        var createdSpaces = spaces.findAllByZoneId(result.zoneId());
        assertThat(createdSpaces).hasSize(2);
        assertThat(createdSpaces).allSatisfy(space -> {
            assertThat(space.getVerificationStatus()).isEqualTo(VerificationStatus.PROPOSED);
            assertThat(space.getPolygon()).startsWith("[[").isNotBlank();
            assertThat(space.getPositionX()).isNotNull();
        });
        assertThat(createdSpaces).extracting(space -> space.getCode())
                .containsExactlyInAnyOrder("A01", "A02");
        assertThat(createdSpaces.stream()
                .filter(space -> "A01".equals(space.getCode()))
                .findFirst().orElseThrow().getPolygon())
                .contains("[0,0]").contains("2.5,0");
    }

    @Test
    void surveyIsMarkedImportedAndCannotBeImportedTwice() {
        zones.save(Fixtures.zone(site, "P1"));
        Long surveyId = storeSurvey(LAYOUT);
        surveyService.importSpaces(site.getId(), surveyId);

        var stored = surveyService.findById(surveyId);
        assertThat(stored.imported()).isTrue();
        assertThat(stored.importedSpaceCount()).isEqualTo(2);

        assertThatThrownBy(() -> surveyService.importSpaces(site.getId(), surveyId))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void importRequiresAnExistingZone() {
        Long surveyId = storeSurvey(LAYOUT);
        assertThatThrownBy(() -> surveyService.importSpaces(site.getId(), surveyId))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("zone");
    }

    @Test
    void malformedLayoutIsRejected() {
        zones.save(Fixtures.zone(site, "P1"));
        Long surveyId = storeSurvey("{\"profile\":\"CAR\"}");

        assertThatThrownBy(() -> surveyService.importSpaces(site.getId(), surveyId))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void surveysAreListedForTheirSite() {
        zones.save(Fixtures.zone(site, "P1"));
        storeSurvey(LAYOUT);

        var surveys = surveyService.findBySite(site.getId());

        assertThat(surveys).hasSize(1);
        assertThat(surveys.get(0).siteName()).isEqualTo(site.getName());
        assertThat(surveys.get(0).profile()).isEqualTo("CAR");
    }
}
