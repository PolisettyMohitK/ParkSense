package com.parking.platform.controller;

import com.parking.platform.dto.response.AnalyticsSummary;
import com.parking.platform.dto.response.HeatmapCell;
import com.parking.platform.dto.response.UtilizationPoint;
import com.parking.platform.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService service;

    @GetMapping("/summary")
    public AnalyticsSummary summary() {
        return service.summary();
    }

    @GetMapping("/utilization")
    public List<UtilizationPoint> utilization(
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return service.utilization(zoneId, from, to);
    }

    @GetMapping("/heatmap")
    public List<HeatmapCell> heatmap(
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return service.heatmap(zoneId, from, to);
    }
}
