package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Note;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.TreeSet;

/**
 * Public projection of a note. Tags are returned sorted for stable output.
 */
public record NoteResponse(
        Long id,
        Long ownerId,
        LocalDate date,
        String title,
        String content,
        List<String> tags,
        Instant createdAt,
        Instant updatedAt
) {
    public static NoteResponse from(Note note) {
        return new NoteResponse(
                note.getId(),
                note.getOwnerId(),
                note.getDate(),
                note.getTitle(),
                note.getContent(),
                List.copyOf(new TreeSet<>(note.getTags())),
                note.getCreatedAt(),
                note.getUpdatedAt()
        );
    }
}
