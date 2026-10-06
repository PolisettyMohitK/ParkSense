package com.parking.platform.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parking.platform.dto.request.SiteSurveyRequest;
import com.parking.platform.dto.response.SiteSurveyResponse;
import com.parking.platform.dto.response.SurveyImportResponse;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.SiteSurvey;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.ParkingZoneRepository;
import com.parking.platform.repository.SiteSurveyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Site surveys: store what the vision service measured, then turn the generated
 * layout into PROPOSED spaces that staff verify in the app.
 */
@Service
@RequiredArgsConstructor
public class SiteSurveyService {

    private final SiteSurveyRepository repository;
    private final ParkingZoneRepository zoneRepository;
    private final ParkingSpaceRepository spaceRepository;
    private final ParkingSiteService siteService;
    private final ObjectMapper objectMapper;

    @Transactional
    public SiteSurveyResponse create(Long siteId, SiteSurveyRequest request) {
        ParkingSite site = siteService.getEntity(siteId);
        SiteSurvey survey = SiteSurvey.builder()
                .site(site)
                .surveyJobId(request.surveyJobId())
                .profile(request.profile())
                .status(request.status() == null || request.status().isBlank() ? "completed" : request.status())
                .layoutJson(request.layoutJson())
                .reportJson(request.reportJson())
                .build();
        return toResponse(repository.save(survey));
    }

    @Transactional(readOnly = true)
    public List<SiteSurveyResponse> findBySite(Long siteId) {
        return repository.findAllBySiteIdOrderByCreatedAtDesc(siteId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SiteSurveyResponse findById(Long surveyId) {
        return toResponse(getEntity(surveyId));
    }

    @Transactional
    public SurveyImportResponse importSpaces(Long siteId, Long surveyId) {
        SiteSurvey survey = getEntity(surveyId);
        if (survey.getSite() == null || !survey.getSite().getId().equals(siteId)) {
            throw new BadRequestException("Survey does not belong to this site");
        }
        if (survey.isImported()) {
            throw new ConflictException("Survey has already been imported");
        }

        ParkingZone zone = zoneRepository.findAllBySiteId(siteId).stream().findFirst()
                .orElseThrow(() -> new BadRequestException(
                        "Create at least one parking zone for this site before importing a layout"));

        JsonNode bays = readBays(survey.getLayoutJson());
        int created = 0;
        for (JsonNode bay : bays) {
            String code = bay.path("code").asText(null);
            JsonNode polygon = bay.path("polygon");
            JsonNode centre = bay.path("centre");
            if (polygon.isMissingNode() || polygon.size() < 3) {
                continue;
            }
            if (code != null && !code.isBlank()
                    && spaceRepository.findByZoneIdAndCode(zone.getId(), code).isPresent()) {
                continue; // respect the per-zone unique code
            }
            spaceRepository.save(ParkingSpace.builder()
                    .zone(zone)
                    .code(code)
                    .occupancyState(OccupancyState.VACANT)
                    .operationalState(OperationalState.IN_SERVICE)
                    .verificationStatus(VerificationStatus.PROPOSED)
                    .polygon(polygon.toString())
                    .positionX(centre.size() > 0 ? centre.get(0).asDouble() : null)
                    .positionY(centre.size() > 1 ? centre.get(1).asDouble() : null)
                    .active(true)
                    .build());
            created++;
        }

        if (created == 0) {
            throw new BadRequestException("The survey layout contains no usable bays");
        }

        survey.setImported(true);
        survey.setImportedSpaceCount(created);
        survey.setImportedAt(Instant.now());
        repository.save(survey);

        return new SurveyImportResponse(survey.getId(), zone.getId(), zone.getName(), created);
    }

    private JsonNode readBays(String layoutJson) {
        try {
            JsonNode bays = objectMapper.readTree(layoutJson).path("bays");
            if (!bays.isArray()) {
                throw new BadRequestException("layoutJson must contain a 'bays' array");
            }
            return bays;
        } catch (BadRequestException error) {
            throw error;
        } catch (Exception error) {
            throw new BadRequestException("layoutJson is not valid JSON: " + error.getMessage());
        }
    }

    public SiteSurvey getEntity(Long surveyId) {
        return repository.findById(surveyId)
                .orElseThrow(() -> ResourceNotFoundException.of("SiteSurvey", surveyId));
    }

    private SiteSurveyResponse toResponse(SiteSurvey survey) {
        return new SiteSurveyResponse(
                survey.getId(),
                survey.getSite() == null ? null : survey.getSite().getId(),
                survey.getSite() == null ? null : survey.getSite().getName(),
                survey.getSurveyJobId(),
                survey.getProfile(),
                survey.getStatus(),
                survey.isImported(),
                survey.getImportedSpaceCount(),
                survey.getImportedAt(),
                survey.getLayoutJson(),
                survey.getReportJson(),
                survey.getCreatedAt());
    }
}
