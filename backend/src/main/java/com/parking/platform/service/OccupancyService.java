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
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
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
    private final Clock clock;

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

        // The audit actor is whoever is signed in; a client-supplied id is only honoured for
        // unauthenticated internal callers (seeders, jobs).
        Long actorId = SecurityUtils.currentUserId() != null ? SecurityUtils.currentUserId() : request.actorUserId();
        User actor = actorId != null ? userRepository.findById(actorId).orElse(null) : null;
        MonitoringDevice device = request.deviceId() != null
                ? deviceRepository.findById(request.deviceId())
                        .orElseThrow(() -> ResourceNotFoundException.of("MonitoringDevice", request.deviceId()))
                : null;
        Instant now = Instant.now(clock);
        Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : now;
        if (occurredAt.isAfter(now.plusSeconds(60))) {
            throw new BadRequestException("Event time cannot be in the future");
        }
        // Events can arrive out of order (camera batches, retries). A reading older than the latest
        // one for this space is kept for the audit trail but must not roll the space state back.
        boolean stale = repository.findFirstBySpaceIdOrderByOccurredAtDescIdDesc(space.getId())
                .map(latest -> occurredAt.isBefore(latest.getOccurredAt()))
                .orElse(false);

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

        OccupancyEvent saved = repository.save(event);
        if (stale) {
            return mapper.toResponse(saved);
        }

        applyStateToSpace(space, request.state());
        spaceRepository.save(space);
        if (request.state() == OccupancyState.OCCUPIED) {
            sessionService.checkIn(space, request.source(), occurredAt);
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
