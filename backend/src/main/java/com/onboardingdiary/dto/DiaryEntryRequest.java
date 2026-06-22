package com.onboardingdiary.dto;

import jakarta.validation.constraints.NotBlank;

public record DiaryEntryRequest(
    @NotBlank String title,
    @NotBlank String content,
    boolean isPublic
) {}
