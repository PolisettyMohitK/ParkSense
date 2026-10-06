package com.parking.platform.controller;

import com.parking.platform.dto.response.PlaceDetailResponse;
import com.parking.platform.dto.response.PlaceSummaryResponse;
import com.parking.platform.entity.enums.PlaceCategory;
import com.parking.platform.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService service;

    @GetMapping
    public List<PlaceSummaryResponse> search(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) PlaceCategory category,
            @RequestParam(required = false, defaultValue = "50") Integer limit) {
        return service.search(lat, lng, q, category, limit == null ? 50 : limit);
    }

    @GetMapping("/{siteId}")
    public PlaceDetailResponse detail(
            @PathVariable Long siteId,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        return service.detail(siteId, lat, lng);
    }
}
