package com.parking.platform.controller;

import com.parking.platform.dto.request.ParkingSpaceRequest;
import com.parking.platform.dto.response.ParkingSpaceResponse;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.service.ParkingSpaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/parking/spaces")
@RequiredArgsConstructor
public class ParkingSpaceController {

    private final ParkingSpaceService service;

    @GetMapping
    public List<ParkingSpaceResponse> findAll(@RequestParam(required = false) Long zoneId) {
        return zoneId == null ? service.findAll() : service.findByZone(zoneId);
    }

    @GetMapping("/{id}")
    public ParkingSpaceResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<ParkingSpaceResponse> create(@Valid @RequestBody ParkingSpaceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ParkingSpaceResponse update(@PathVariable Long id, @Valid @RequestBody ParkingSpaceRequest request) {
        return service.update(id, request);
    }

    @PatchMapping("/{id}/verify")
    public ParkingSpaceResponse verify(@PathVariable Long id, @RequestParam VerificationStatus status) {
        return service.verify(id, status);
    }

    @PatchMapping("/{id}/operational-state")
    public ParkingSpaceResponse changeOperationalState(@PathVariable Long id, @RequestParam OperationalState state) {
        return service.changeOperationalState(id, state);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
