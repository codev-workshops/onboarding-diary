package com.codev.onboardingdiary.auth.dto;

import com.codev.onboardingdiary.user.UserDto;

public record AuthResponse(String accessToken, long expiresIn, UserDto user) {}
