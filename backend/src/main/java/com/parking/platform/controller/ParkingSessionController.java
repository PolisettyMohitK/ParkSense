package com.parking.platform.controller;

import com.parking.platform.dto.response.ParkingSessionResponse;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.dto.request.PaymentRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.parking.platform.service.ParkingSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class ParkingSessionController {

    private final ParkingSessionService service;

    @GetMapping
    public List<ParkingSessionResponse> findAll(
            @RequestParam(required = false) SessionStatus status,
            @RequestParam(required = false) Long spaceId) {
        return service.findAll(status, spaceId);
    }

    @GetMapping("/{id}")
    public ParkingSessionResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    /** Staff records an offline payment collected at the gate. */
    @PostMapping("/{id}/pay")
    public ParkingSessionResponse recordPayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return service.recordPayment(id, request.method());
    }

    @GetMapping("/spaces/{spaceId}/active")
    public ResponseEntity<ParkingSessionResponse> activeForSpace(@PathVariable Long spaceId) {
        ParkingSessionResponse response = service.activeForSpace(spaceId);
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }
}
