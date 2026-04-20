package com.onboarding.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal) {
            return (UserPrincipal) authentication.getPrincipal();
        }
        throw new IllegalStateException("No authenticated user found");
    }

    public static String getCurrentUserId() {
        return getCurrentUser().getUserId();
    }

    public static String getCurrentUserRole() {
        return getCurrentUser().getRole();
    }

    public static boolean isAdmin() {
        return "ADMIN".equals(getCurrentUserRole());
    }

    public static boolean isManager() {
        return "MANAGER".equals(getCurrentUserRole());
    }

    public static boolean isRecruit() {
        return "RECRUIT".equals(getCurrentUserRole());
    }
}
