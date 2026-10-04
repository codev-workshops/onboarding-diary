package com.codev.onboardingdiary.note;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/** Create/update payload. Notes are private unless {@code shared} is true. */
public record NoteRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 150) String title,
    @NotBlank @Size(max = 20000) String content,
    @Size(max = 10, message = "A note can have at most 10 tags")
        List<@NotBlank @Size(max = 40) String> tags,
    Boolean shared,
    Integer version) {}
