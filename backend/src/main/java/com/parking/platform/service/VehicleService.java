package com.parking.platform.service;

import com.parking.platform.dto.request.VehicleRequest;
import com.parking.platform.dto.response.VehicleResponse;
import com.parking.platform.entity.User;
import com.parking.platform.entity.Vehicle;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.VehicleMapper;
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
    private final UserService userService;
    private final VehicleMapper mapper;

    @Transactional(readOnly = true)
    public List<VehicleResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findByOwner(Long ownerId) {
        return repository.findAllByOwnerId(ownerId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public VehicleResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public VehicleResponse create(VehicleRequest request) {
        Long ownerId = SecurityUtils.isAdminOrManager() ? request.ownerId() : SecurityUtils.currentUserId();
        if (ownerId == null) {
            throw new AccessDeniedException("Cannot determine vehicle owner");
        }
        User owner = userService.getEntity(ownerId);
        Vehicle entity = mapper.toEntity(request);
        entity.setOwner(owner);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public VehicleResponse update(Long id, VehicleRequest request) {
        Vehicle entity = getEntity(id);
        assertCanManage(entity);
        mapper.updateEntity(request, entity);
        Long ownerId = SecurityUtils.isAdminOrManager() ? request.ownerId() : entity.getOwner().getId();
        entity.setOwner(userService.getEntity(ownerId));
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        Vehicle entity = getEntity(id);
        assertCanManage(entity);
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
}
