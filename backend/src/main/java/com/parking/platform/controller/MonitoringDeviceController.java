package com.parking.platform.controller;

import com.parking.platform.dto.request.MonitoringDeviceRequest;
import com.parking.platform.dto.response.MonitoringDeviceResponse;
import com.parking.platform.service.MonitoringDeviceService;
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
@RequestMapping("/api/devices")
@RequiredArgsConstructor
public class MonitoringDeviceController {

    private final MonitoringDeviceService service;

    @GetMapping
    public List<MonitoringDeviceResponse> findAll(@RequestParam(required = false) Long zoneId) {
        return zoneId == null ? service.findAll() : service.findByZone(zoneId);
    }

    @GetMapping("/{id}")
    public MonitoringDeviceResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<MonitoringDeviceResponse> create(@Valid @RequestBody MonitoringDeviceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public MonitoringDeviceResponse update(@PathVariable Long id, @Valid @RequestBody MonitoringDeviceRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
