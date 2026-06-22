package com.onboardingdiary.dto;

import java.time.LocalDateTime;

public record ShareResponse(
    Long id,
    Long entryId,
    String platform,
    LocalDateTime sharedAt,
    String postUrl,
    String message
) {}
