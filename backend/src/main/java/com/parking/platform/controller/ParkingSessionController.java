package com.parking.platform.controller;

import com.parking.platform.dto.response.ParkingSessionResponse;
import com.parking.platform.entity.enums.SessionStatus;
import com.parking.platform.security.SecurityUtils;
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
        if (!SecurityUtils.isAdminOrManager()) {
            Long currentUserId = SecurityUtils.currentUserId();
            return currentUserId == null ? List.of() : service.findByUser(currentUserId);
        }
        return service.findAll(status, spaceId);
    }

    @GetMapping("/{id}")
    public ParkingSessionResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/spaces/{spaceId}/active")
    public ResponseEntity<ParkingSessionResponse> activeForSpace(@PathVariable Long spaceId) {
        ParkingSessionResponse response = service.activeForSpace(spaceId);
        return response == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(response);
    }
}
