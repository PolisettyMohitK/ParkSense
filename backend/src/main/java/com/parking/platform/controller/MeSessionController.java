package com.parking.platform.controller;

import com.parking.platform.dto.response.MySessionResponse;
import com.parking.platform.service.ParkingSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import com.parking.platform.dto.request.PaymentRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/me/sessions")
@RequiredArgsConstructor
public class MeSessionController {

    private final ParkingSessionService service;

    @GetMapping
    public List<MySessionResponse> mySessions() {
        return service.findMySessions();
    }

    @GetMapping("/{id}")
    public MySessionResponse mySession(@PathVariable Long id) {
        return service.findMySession(id);
    }

    @PostMapping("/{id}/pay")
    public MySessionResponse pay(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return service.payMine(id, request.method());
    }

    @GetMapping("/active")
    public ResponseEntity<MySessionResponse> activeSession() {
        return service.findMyActiveSession()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
