package com.parking.platform.controller;

import com.parking.platform.dto.request.ReservationRequest;
import com.parking.platform.dto.response.MySessionResponse;
import com.parking.platform.dto.response.ReservationResponse;
import com.parking.platform.security.SecurityUtils;
import com.parking.platform.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService service;

    @GetMapping
    public List<ReservationResponse> findAll(@RequestParam(required = false) Long userId) {
        if (!SecurityUtils.isAdminOrManager()) {
            Long currentId = SecurityUtils.currentUserId();
            return currentId == null ? List.of() : service.findByUser(currentId);
        }
        return userId == null ? service.findAll() : service.findByUser(userId);
    }

    @GetMapping("/{id}")
    public ReservationResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<ReservationResponse> create(@Valid @RequestBody ReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PatchMapping("/{id}/cancel")
    public ReservationResponse cancel(@PathVariable Long id) {
        return service.cancel(id);
    }

    @PostMapping("/{id}/check-in")
    public ReservationResponse checkIn(@PathVariable Long id) {
        return service.checkIn(id);
    }

    @PostMapping("/{id}/check-out")
    public MySessionResponse checkOut(@PathVariable Long id) {
        return service.checkOut(id);
    }

    @PatchMapping("/{id}/complete")
    public ReservationResponse complete(@PathVariable Long id) {
        return service.complete(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
