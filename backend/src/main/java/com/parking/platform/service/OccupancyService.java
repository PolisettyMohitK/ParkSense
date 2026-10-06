package com.parking.platform.service;

import com.parking.platform.dto.request.OccupancyEventRequest;
import com.parking.platform.dto.response.OccupancyEventResponse;
import com.parking.platform.entity.MonitoringDevice;
import com.parking.platform.entity.OccupancyEvent;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.OccupancyState;
import com.parking.platform.event.OccupancyChangedEvent;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.OccupancyEventMapper;
import com.parking.platform.repository.MonitoringDeviceRepository;
import com.parking.platform.repository.OccupancyEventRepository;
import com.parking.platform.repository.ParkingSpaceRepository;
import com.parking.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OccupancyService {

    private final OccupancyEventRepository repository;
    private final ParkingSpaceRepository spaceRepository;
    private final UserRepository userRepository;
    private final MonitoringDeviceRepository deviceRepository;
    private final ParkingSessionService sessionService;
    private final OccupancyEventMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public OccupancyEventResponse recordEvent(OccupancyEventRequest request) {
        if (request.externalId() != null && !request.externalId().isBlank()) {
            Optional<OccupancyEvent> duplicate =
                    repository.findBySourceAndExternalId(request.source(), request.externalId());
            if (duplicate.isPresent()) {
                return mapper.toResponse(duplicate.get());
            }
        }

        ParkingSpace space = spaceRepository.findById(request.spaceId())
                .orElseThrow(() -> ResourceNotFoundException.of("ParkingSpace", request.spaceId()));

        User actor = request.actorUserId() != null
                ? userRepository.findById(request.actorUserId()).orElse(null)
                : null;
        MonitoringDevice device = request.deviceId() != null
                ? deviceRepository.findById(request.deviceId()).orElse(null)
                : null;
        Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : Instant.now();

        OccupancyEvent event = OccupancyEvent.builder()
                .space(space)
                .state(request.state())
                .source(request.source())
                .confidence(request.confidence())
                .actorUser(actor)
                .device(device)
                .externalId(request.externalId())
                .note(request.note())
                .occurredAt(occurredAt)
                .build();

        applyStateToSpace(space, request.state());
        spaceRepository.save(space);
        OccupancyEvent saved = repository.save(event);

        if (request.state() == OccupancyState.OCCUPIED) {
            sessionService.checkIn(space, request.source(), occurredAt, actor);
        } else if (request.state() == OccupancyState.VACANT) {
            sessionService.checkOut(space, occurredAt);
        }

        eventPublisher.publishEvent(new OccupancyChangedEvent(
                space.getId(),
                space.getCode(),
                space.getZone().getId(),
                space.getZone().getName(),
                request.state(),
                request.source(),
                saved.getOccurredAt()));

        return mapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public OccupancyEventResponse latestForSpace(Long spaceId) {
        return repository.findFirstBySpaceIdOrderByOccurredAtDescIdDesc(spaceId)
                .map(mapper::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<OccupancyEventResponse> historyForSpace(Long spaceId) {
        return repository.findAllBySpaceIdOrderByOccurredAtDesc(spaceId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OccupancyEventResponse> eventsForZone(Long zoneId, Instant from, Instant to) {
        Instant start = from != null ? from : Instant.EPOCH;
        Instant end = to != null ? to : Instant.now();
        return repository.findAllByZoneAndPeriod(zoneId, start, end).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OccupancyEventResponse> eventsBetween(Instant from, Instant to) {
        return repository.findAllByOccurredAtBetween(from, to).stream().map(mapper::toResponse).toList();
    }

    private void applyStateToSpace(ParkingSpace space, OccupancyState state) {
        switch (state) {
            case OCCUPIED -> space.setOccupancyState(OccupancyState.OCCUPIED);
            case VACANT -> space.setOccupancyState(OccupancyState.VACANT);
            case UNKNOWN -> {
            }
        }
    }
}
