package com.onboardingdiary.security;

/**
 * Lightweight authenticated principal extracted from the JWT. Stored as the
 * Spring Security authentication principal.
 */
public record AuthenticatedUser(Long id, String email, String role) {
}
