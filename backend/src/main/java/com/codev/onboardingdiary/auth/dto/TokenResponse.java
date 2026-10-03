package com.codev.onboardingdiary.auth.dto;

public record TokenResponse(String accessToken, long expiresIn) {}
