package com.onboardingdiary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Request to fully update a note owned by the caller.
 */
public record UpdateNoteRequest(
        @NotNull LocalDate date,
        @NotBlank @Size(min = 1, max = 200) String title,
        @Size(max = 10000) String content,
        List<@Size(min = 1, max = 50) String> tags
) {
}
