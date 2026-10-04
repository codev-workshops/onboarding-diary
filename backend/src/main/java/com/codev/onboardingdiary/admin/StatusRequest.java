package com.codev.onboardingdiary.admin;

import jakarta.validation.constraints.NotNull;

public record StatusRequest(@NotNull Boolean enabled) {}
