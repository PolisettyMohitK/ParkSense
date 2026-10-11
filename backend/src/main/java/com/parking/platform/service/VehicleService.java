package com.parking.platform.service;

import com.parking.platform.dto.request.VehicleRequest;
import com.parking.platform.dto.response.VehicleResponse;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.VehicleMapper;
import com.parking.platform.repository.ParkingSessionRepository;
import com.parking.platform.repository.ReservationRepository;
import com.parking.platform.repository.VehicleRepository;
import com.parking.platform.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository repository;
    private final ReservationRepository reservationRepository;
    private final ParkingSessionRepository sessionRepository;
    private final UserService userService;
    private final VehicleMapper mapper;

    @Transactional(readOnly = true)
    public List<VehicleResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findByOwner(Long ownerId) {
        return repository.findAllByOwnerIdAndActiveTrue(ownerId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse findById(Long id) {
        Vehicle entity = getEntity(id);
        assertCanManage(entity);
        return mapper.toResponse(entity);
    }

    @Transactional
    public VehicleResponse create(VehicleRequest request) {
        Long ownerId = SecurityUtils.isAdminOrManager() && request.ownerId() != null
                ? request.ownerId()
                : SecurityUtils.currentUserId();
        if (ownerId == null) {
            throw new AccessDeniedException("Cannot determine vehicle owner");
        }
        User owner = userService.getEntity(ownerId);
        Vehicle entity = mapper.toEntity(request);
        entity.setPlateNumber(normalizePlate(request.plateNumber()));
        entity.setOwner(owner);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public VehicleResponse update(Long id, VehicleRequest request) {
        Vehicle entity = getEntity(id);
        assertCanManage(entity);
        mapper.updateEntity(request, entity);
        entity.setPlateNumber(normalizePlate(request.plateNumber()));
        if (SecurityUtils.isAdminOrManager() && request.ownerId() != null) {
            entity.setOwner(userService.getEntity(request.ownerId()));
        }
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        Vehicle entity = getEntity(id);
        assertCanManage(entity);
        // Keep history intact: vehicles referenced by bookings or sessions are retired instead of removed.
        if (reservationRepository.existsByVehicleId(id) || sessionRepository.existsByVehicleId(id)) {
            entity.setActive(false);
            repository.save(entity);
            return;
        }
        repository.delete(entity);
    }

    public Vehicle getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Vehicle", id));
    }

    private void assertCanManage(Vehicle vehicle) {
        if (SecurityUtils.isAdminOrManager()) {
            return;
        }
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null || vehicle.getOwner() == null
                || !vehicle.getOwner().getId().equals(currentUserId)) {
            throw new AccessDeniedException("You can only manage your own vehicles");
        }
    }

    static String normalizePlate(String plate) {
        return plate == null ? null : plate.trim().replaceAll("\\s+", " ").toUpperCase(java.util.Locale.ROOT);
    }
}
