package com.parking.platform.config;

import com.parking.platform.entity.User;
import com.parking.platform.entity.enums.Role;
import com.parking.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Guarantees an administrator exists on a fresh deployment. Set {@code ADMIN_EMAIL} and
 * {@code ADMIN_PASSWORD}; the account is created once and never modified afterwards.
 * Runs after the demo seeders so it never collides with their accounts.
 */
@Component
@Order(100)
@RequiredArgsConstructor
public class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-email:}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    @Value("${app.bootstrap.admin-name:Platform Admin}")
    private String adminName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            return;
        }
        String email = adminEmail.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            return;
        }
        if (adminPassword.length() < 8) {
            log.warn("ADMIN_PASSWORD is shorter than 8 characters - bootstrap admin not created");
            return;
        }
        userRepository.save(User.builder()
                .fullName(adminName)
                .email(email)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .role(Role.ADMIN)
                .enabled(true)
                .build());
        log.info("Created bootstrap administrator {}", email);
    }
}
