package com.parking.platform.controller;

import com.parking.platform.dto.request.ParkingZoneRequest;
import com.parking.platform.dto.response.ParkingZoneResponse;
import com.parking.platform.dto.response.ZoneOccupancyResponse;
import com.parking.platform.service.ParkingZoneService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/parking/zones")
@RequiredArgsConstructor
public class ParkingZoneController {

    private final ParkingZoneService service;

    @GetMapping
    public List<ParkingZoneResponse> findAll(@RequestParam(required = false) Long siteId) {
        return siteId == null ? service.findAll() : service.findBySite(siteId);
    }

    @GetMapping("/{id}")
    public ParkingZoneResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/occupancy")
    public ZoneOccupancyResponse occupancy(@PathVariable Long id) {
        return service.occupancy(id);
    }

    @PostMapping
    public ResponseEntity<ParkingZoneResponse> create(@Valid @RequestBody ParkingZoneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ParkingZoneResponse update(@PathVariable Long id, @Valid @RequestBody ParkingZoneRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
