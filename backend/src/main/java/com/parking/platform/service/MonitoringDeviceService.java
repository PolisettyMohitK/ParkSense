package com.parking.platform.service;

import com.parking.platform.dto.request.MonitoringDeviceRequest;
import com.parking.platform.dto.response.MonitoringDeviceResponse;
import com.parking.platform.entity.MonitoringDevice;
import com.parking.platform.entity.ParkingZone;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.MonitoringDeviceMapper;
import com.parking.platform.repository.MonitoringDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MonitoringDeviceService {

    private final MonitoringDeviceRepository repository;
    private final ParkingZoneService zoneService;
    private final MonitoringDeviceMapper mapper;

    @Transactional(readOnly = true)
    public List<MonitoringDeviceResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MonitoringDeviceResponse> findByZone(Long zoneId) {
        return repository.findAllByZoneId(zoneId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public MonitoringDeviceResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public MonitoringDeviceResponse create(MonitoringDeviceRequest request) {
        if (repository.existsByZoneIdAndCode(request.zoneId(), request.code())) {
            throw new ConflictException("Device code already exists in zone: " + request.code());
        }
        ParkingZone zone = zoneService.getEntity(request.zoneId());
        MonitoringDevice entity = mapper.toEntity(request);
        entity.setZone(zone);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public MonitoringDeviceResponse update(Long id, MonitoringDeviceRequest request) {
        MonitoringDevice entity = getEntity(id);
        boolean codeChanged = !entity.getCode().equals(request.code());
        boolean zoneChanged = entity.getZone() == null || !entity.getZone().getId().equals(request.zoneId());
        if ((codeChanged || zoneChanged)
                && repository.existsByZoneIdAndCode(request.zoneId(), request.code())) {
            throw new ConflictException("Device code already exists in zone: " + request.code());
        }
        mapper.updateEntity(request, entity);
        entity.setZone(zoneService.getEntity(request.zoneId()));
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        try {
            repository.delete(getEntity(id));
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Device has recorded events - deactivate it instead");
        }
    }

    public MonitoringDevice getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("MonitoringDevice", id));
    }
}
