package com.parking.platform.service;

import com.parking.platform.dto.request.ParkingSiteRequest;
import com.parking.platform.dto.response.ParkingSiteResponse;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.ParkingSite;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.ParkingSiteMapper;
import com.parking.platform.repository.ParkingSiteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParkingSiteService {

    private final ParkingSiteRepository repository;
    private final OrganizationService organizationService;
    private final ParkingSiteMapper mapper;

    @Transactional(readOnly = true)
    public List<ParkingSiteResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ParkingSiteResponse> findByOrganization(Long organizationId) {
        return repository.findAllByOrganizationId(organizationId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ParkingSiteResponse findById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public ParkingSiteResponse create(ParkingSiteRequest request) {
        if (repository.existsByOrganizationIdAndCode(request.organizationId(), request.code())) {
            throw new ConflictException("Site code already exists in organization: " + request.code());
        }
        Organization organization = organizationService.getEntity(request.organizationId());
        ParkingSite entity = mapper.toEntity(request);
        entity.setOrganization(organization);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public ParkingSiteResponse update(Long id, ParkingSiteRequest request) {
        ParkingSite entity = getEntity(id);
        boolean codeChanged = !entity.getCode().equals(request.code());
        boolean orgChanged = entity.getOrganization() == null
                || !entity.getOrganization().getId().equals(request.organizationId());
        if ((codeChanged || orgChanged)
                && repository.existsByOrganizationIdAndCode(request.organizationId(), request.code())) {
            throw new ConflictException("Site code already exists in organization: " + request.code());
        }
        mapper.updateEntity(request, entity);
        entity.setOrganization(organizationService.getEntity(request.organizationId()));
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    public ParkingSite getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("ParkingSite", id));
    }
}
