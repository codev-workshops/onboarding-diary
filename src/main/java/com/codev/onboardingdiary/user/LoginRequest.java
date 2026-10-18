package com.codev.onboardingdiary.user;

import jakarta.validation.constraints.NotBlank;

/** Email/password login. */
public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
