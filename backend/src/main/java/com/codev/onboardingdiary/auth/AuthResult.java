package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.user.UserDto;

/** Outcome of a successful authentication: tokens plus the user they belong to. */
public record AuthResult(String accessToken, String refreshToken, UserDto user) {}
