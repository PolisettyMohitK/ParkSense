package com.parking.platform.service;

import com.parking.platform.dto.request.LoginRequest;
import com.parking.platform.dto.request.RegisterRequest;
import com.parking.platform.dto.response.AuthResponse;
import com.parking.platform.entity.Organization;
import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.exception.ResourceNotFoundException;
import com.parking.platform.mapper.UserMapper;
import com.parking.platform.repository.UserRepository;
import com.parking.platform.security.JwtService;
import com.parking.platform.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final OrganizationService organizationService;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email already registered: " + request.email());
        }
        User user = User.builder()
                .fullName(request.fullName())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .phone(request.phone())
                .enabled(true)
                .build();
        if (request.organizationId() != null) {
            Organization organization = organizationService.getEntity(request.organizationId());
            user.setOrganization(organization);
        }
        return buildAuth(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.email()));
        return buildAuth(user);
    }

    private AuthResponse buildAuth(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);
        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), userMapper.toResponse(user));
    }
}
