package com.parking.platform.service;

import com.parking.platform.dto.request.UserRequest;
import com.parking.platform.dto.response.UserResponse;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.UserMapper;
import com.parking.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import com.parking.platform.security.SecurityUtils;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;
    private final OrganizationService organizationService;
    private final UserMapper mapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse findById(Long id) {
        if (!SecurityUtils.isAdminOrManager() && !id.equals(SecurityUtils.currentUserId())) {
            throw new AccessDeniedException("You can only view your own profile");
        }
        return mapper.toResponse(getEntity(id));
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        if (request.password() == null || request.password().isBlank()) {
            throw new BadRequestException("Password is required when creating a user");
        }
        if (repository.existsByEmail(request.email())) {
            throw new ConflictException("Email already registered: " + request.email());
        }
        User entity = mapper.toEntity(request);
        entity.setEnabled(request.enabled() == null || request.enabled());
        entity.setPasswordHash(passwordEncoder.encode(request.password()));
        entity.setRole(request.role() != null ? request.role() : Role.USER);
        applyOrganization(entity, request.organizationId());
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        User entity = getEntity(id);
        if (!entity.getEmail().equals(request.email()) && repository.existsByEmail(request.email())) {
            throw new ConflictException("Email already registered: " + request.email());
        }
        mapper.updateEntity(request, entity);
        if (request.password() != null && !request.password().isBlank()) {
            entity.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        applyOrganization(entity, request.organizationId());
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long id) {
        if (id.equals(SecurityUtils.currentUserId())) {
            throw new BadRequestException("You cannot delete your own account");
        }
        User user = getEntity(id);
        try {
            repository.delete(user);
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("User has bookings or vehicles on record - disable the account instead");
        }
    }

    public User getEntity(Long id) {
        return repository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    private void applyOrganization(User entity, Long organizationId) {
        if (organizationId == null) {
            entity.setOrganization(null);
            return;
        }
        Organization organization = organizationService.getEntity(organizationId);
        entity.setOrganization(organization);
    }
}
