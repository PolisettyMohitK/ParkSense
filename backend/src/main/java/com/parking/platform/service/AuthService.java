package com.parking.platform.service;

import com.parking.platform.dto.request.ChangePasswordRequest;
import com.parking.platform.dto.request.LoginRequest;
import com.parking.platform.dto.request.ProfileUpdateRequest;
import com.parking.platform.dto.request.RegisterRequest;
import com.parking.platform.dto.response.AuthResponse;
import com.parking.platform.dto.response.UserResponse;
import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.exception.BadRequestException;
import com.parking.platform.exception.ConflictException;
import com.parking.platform.mapper.UserMapper;
import com.parking.platform.repository.UserRepository;
import com.parking.platform.security.JwtService;
import com.parking.platform.security.SecurityUtils;
import com.parking.platform.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("An account with this email already exists");
        }
        // Self-registration always creates a driver account; staff accounts are created by an admin.
        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .phone(blankToNull(request.phone()))
                .enabled(true)
                .build();
        return buildAuth(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return buildAuth(user);
    }

    @Transactional(readOnly = true)
    public UserResponse me() {
        return userMapper.toResponse(currentUser());
    }

    @Transactional
    public UserResponse updateProfile(ProfileUpdateRequest request) {
        User user = currentUser();
        user.setFullName(request.fullName().trim());
        user.setPhone(blankToNull(request.phone()));
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUser();
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new BadRequestException("New password must be different from the current one");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private User currentUser() {
        Long id = SecurityUtils.currentUserId();
        if (id == null) {
            throw new AccessDeniedException("Authentication required");
        }
        return userRepository.findById(id).orElseThrow(() -> new AccessDeniedException("Account no longer exists"));
    }

    private AuthResponse buildAuth(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtService.generateToken(principal);
        return new AuthResponse(token, "Bearer", jwtService.getExpirationMs(), userMapper.toResponse(user));
    }

    static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
