package com.onboardingdiary.dto;

public record LoginResponse(
        String token,
        long expiresIn,
        UserResponse user
) {
}
