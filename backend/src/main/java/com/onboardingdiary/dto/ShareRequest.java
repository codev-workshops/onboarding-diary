package com.onboardingdiary.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ShareRequest(
    @NotNull @Pattern(regexp = "twitter|linkedin|facebook", message = "Platform must be twitter, linkedin, or facebook")
    String platform,
    String message
) {}
