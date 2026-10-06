package com.parking.platform.controller;

import com.parking.platform.dto.request.OccupancyEventRequest;
import com.parking.platform.dto.response.OccupancyEventResponse;
import com.parking.platform.service.OccupancyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/occupancy")
@RequiredArgsConstructor
public class OccupancyController {

    private final OccupancyService service;

    @PostMapping("/events")
    public ResponseEntity<OccupancyEventResponse> record(@Valid @RequestBody OccupancyEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.recordEvent(request));
    }

    @GetMapping("/spaces/{spaceId}/latest")
    public ResponseEntity<OccupancyEventResponse> latest(@PathVariable Long spaceId) {
        OccupancyEventResponse response = service.latestForSpace(spaceId);
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }

    @GetMapping("/spaces/{spaceId}/history")
    public List<OccupancyEventResponse> history(@PathVariable Long spaceId) {
        return service.historyForSpace(spaceId);
    }

    @GetMapping("/zones/{zoneId}")
    public List<OccupancyEventResponse> zoneEvents(
            @PathVariable Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return service.eventsForZone(zoneId, from, to);
    }
}
