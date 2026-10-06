package com.parking.platform.service;

import com.parking.platform.dto.request.OrganizationRequest;
import com.parking.platform.dto.response.OrganizationResponse;
import com.parking.platform.entity.Organization;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.OrganizationMapper;
import com.parking.platform.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository repository;
    private final OrganizationMapper mapper;

    @Transactional(readOnly = true)
    public List<OrganizationResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrganizationResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public OrganizationResponse create(OrganizationRequest request) {
        if (repository.existsByCode(request.code())) {
            throw new ConflictException("Organization code already exists: " + request.code());
        }
        Organization entity = mapper.toEntity(request);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public OrganizationResponse update(Long id, OrganizationRequest request) {
        Organization entity = getEntity(id);
        if (!entity.getCode().equals(request.code()) && repository.existsByCode(request.code())) {
            throw new ConflictException("Organization code already exists: " + request.code());
        }
        mapper.updateEntity(request, entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    public Organization getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Organization", id));
    }
}
