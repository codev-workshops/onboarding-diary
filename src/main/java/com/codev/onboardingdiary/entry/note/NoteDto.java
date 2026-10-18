package com.codev.onboardingdiary.entry.note;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** API representation of a note; tags are sorted alphabetically. */
public record NoteDto(
    Long id,
    LocalDate entryDate,
    String title,
    String content,
    List<String> tags,
    Instant createdAt,
    Instant updatedAt) {

  public static NoteDto of(Note note) {
    return new NoteDto(
        note.getId(),
        note.getEntryDate(),
        note.getTitle(),
        note.getContent(),
        note.getTags().stream().sorted().toList(),
        note.getCreatedAt(),
        note.getUpdatedAt());
  }
}
