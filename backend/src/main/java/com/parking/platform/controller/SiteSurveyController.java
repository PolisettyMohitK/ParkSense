package com.parking.platform.controller;

import com.parking.platform.dto.request.SiteSurveyRequest;
import com.parking.platform.dto.response.SiteSurveyResponse;
import com.parking.platform.dto.response.SurveyImportResponse;
import com.parking.platform.service.SiteSurveyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/parking/sites/{siteId}/surveys")
@RequiredArgsConstructor
public class SiteSurveyController {

    private final SiteSurveyService service;

    @GetMapping
    public List<SiteSurveyResponse> findBySite(@PathVariable Long siteId) {
        return service.findBySite(siteId);
    }

    @PostMapping
    public ResponseEntity<SiteSurveyResponse> create(@PathVariable Long siteId,
                                                     @Valid @RequestBody SiteSurveyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(siteId, request));
    }

    @PostMapping("/{surveyId}/import")
    public SurveyImportResponse importSpaces(@PathVariable Long siteId, @PathVariable Long surveyId) {
        return service.importSpaces(siteId, surveyId);
    }
}
