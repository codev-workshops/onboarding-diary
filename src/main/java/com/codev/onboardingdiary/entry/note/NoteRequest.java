package com.codev.onboardingdiary.entry.note;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

/** Create/update payload for a note. Tags are normalised by {@link NoteTags}. */
public record NoteRequest(
    @NotNull LocalDate entryDate,
    @NotBlank @Size(max = 120) String title,
    @NotBlank @Size(max = 10000) String content,
    List<String> tags) {}
