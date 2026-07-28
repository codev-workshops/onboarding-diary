package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/** Create/update payload for an additional note (REQUIREMENTS 2.5, 6.1). */
public record NoteRequest(
        @NotNull(message = "Entry date is required")
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
        LocalDate entryDate,

        @NotBlank(message = "Title is required")
        @Size(min = 1, max = 150, message = "Title must be between 1 and 150 characters")
        String title,

        @NotBlank(message = "Content is required")
        @Size(min = 1, max = 10000, message = "Content must be between 1 and 10000 characters")
        String content,

        @Size(max = 10, message = "At most 10 tags are allowed")
        List<String> tags) {
}
