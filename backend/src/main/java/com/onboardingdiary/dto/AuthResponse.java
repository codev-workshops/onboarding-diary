package com.onboardingdiary.dto;

public record AuthResponse(
    String token,
    String username,
    String role
) {}
