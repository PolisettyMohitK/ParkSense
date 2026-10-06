package com.parking.platform.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static Optional<UserPrincipal> currentPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static Long currentUserId() {
        return currentPrincipal().map(UserPrincipal::getId).orElse(null);
    }

    public static boolean hasRole(String role) {
        return currentPrincipal()
                .map(principal -> principal.getUser().getRole().name().equals(role))
                .orElse(false);
    }

    public static boolean isAdmin() {
        return hasRole("ADMIN");
    }

    public static boolean isAdminOrManager() {
        return hasRole("ADMIN") || hasRole("MANAGER");
    }
}
