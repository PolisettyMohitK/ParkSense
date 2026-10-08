package com.parking.platform.controller;

import com.parking.platform.dto.response.MySessionResponse;
import com.parking.platform.service.ParkingSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
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

    @GetMapping("/active")
    public ResponseEntity<MySessionResponse> activeSession() {
        return service.findMyActiveSession()
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
