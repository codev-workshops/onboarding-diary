package com.codev.onboardingdiary.note;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record NoteResponse(
    Long id,
    LocalDate entryDate,
    String title,
    String content,
    List<String> tags,
    boolean shared,
    Instant createdAt,
    Instant updatedAt,
    int version) {

  static NoteResponse from(Note note) {
    return new NoteResponse(
        note.getId(),
        note.getEntryDate(),
        note.getTitle(),
        note.getContent(),
        note.getTags(),
        note.isShared(),
        note.getCreatedAt(),
        note.getUpdatedAt(),
        note.getVersion());
  }
}
