package com.parking.platform.service;

import com.parking.platform.dto.request.ParkingSpaceRequest;
import com.parking.platform.dto.response.ParkingSpaceResponse;
import com.parking.platform.entity.ParkingSpace;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.entity.enums.OperationalState;
import com.parking.platform.entity.enums.VerificationStatus;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ParkingSpaceMapper;
import com.parking.platform.repository.ParkingSpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkingSpaceService {

    private final ParkingSpaceRepository repository;
    private final ParkingZoneService zoneService;
    private final ParkingSpaceMapper mapper;

    @Transactional(readOnly = true)
    public List<ParkingSpaceResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ParkingSpaceResponse> findByZone(Long zoneId) {
        return repository.findAllByZoneId(zoneId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ParkingSpaceResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public ParkingSpaceResponse create(ParkingSpaceRequest request) {
        validateCode(request.zoneId(), request.code(), null);
        ParkingZone zone = zoneService.getEntity(request.zoneId());
        ParkingSpace entity = mapper.toEntity(request);
        entity.setZone(zone);
        if (entity.getOperationalState() == null) {
            entity.setOperationalState(OperationalState.IN_SERVICE);
        }
        if (entity.getVerificationStatus() == null) {
            entity.setVerificationStatus(
                    request.code() == null ? VerificationStatus.PROPOSED : VerificationStatus.VERIFIED);
        }
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public ParkingSpaceResponse update(Long id, ParkingSpaceRequest request) {
        ParkingSpace entity = getEntity(id);
        validateCode(request.zoneId(), request.code(), id);
        mapper.updateEntity(request, entity);
        entity.setZone(zoneService.getEntity(request.zoneId()));
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public ParkingSpaceResponse verify(Long id, VerificationStatus status) {
        ParkingSpace entity = getEntity(id);
        if (status == VerificationStatus.VERIFIED && (entity.getCode() == null || entity.getCode().isBlank())) {
            throw new BadRequestException("A space needs a code before it can be verified");
        }
        entity.setVerificationStatus(status);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public ParkingSpaceResponse changeOperationalState(Long id, OperationalState state) {
        ParkingSpace entity = getEntity(id);
        entity.setOperationalState(state);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        try {
            repository.delete(getEntity(id));
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Space has occupancy history or bookings - set it out of service or deactivate it instead");
        }
    }

    public ParkingSpace getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("ParkingSpace", id));
    }

    private void validateCode(Long zoneId, String code, Long currentId) {
        if (code == null || code.isBlank()) {
            return;
        }
        repository.findByZoneIdAndCode(zoneId, code).ifPresent(existing -> {
            if (currentId == null || !existing.getId().equals(currentId)) {
                throw new ConflictException("Space code already exists in zone: " + code);
            }
        });
    }
}
