package com.parking.platform.controller;

import com.parking.platform.dto.request.ParkingSiteRequest;
import com.parking.platform.dto.response.ParkingSiteResponse;
import com.parking.platform.service.ParkingSiteService;
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
@RequestMapping("/api/parking/sites")
@RequiredArgsConstructor
public class ParkingSiteController {

    private final ParkingSiteService service;

    @GetMapping
    public List<ParkingSiteResponse> findAll(@RequestParam(required = false) Long organizationId) {
        return organizationId == null ? service.findAll() : service.findByOrganization(organizationId);
    }

    @GetMapping("/{id}")
    public ParkingSiteResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<ParkingSiteResponse> create(@Valid @RequestBody ParkingSiteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public ParkingSiteResponse update(@PathVariable Long id, @Valid @RequestBody ParkingSiteRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
