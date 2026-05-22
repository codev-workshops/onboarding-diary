package com.onboardingdiary.dto.response;

import com.onboardingdiary.entity.Note;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class NoteResponse {
    private UUID id;
    private UUID userId;
    private LocalDate date;
    private String title;
    private String content;
    private List<String> tags;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static NoteResponse from(Note note) {
        List<String> tagList = note.getTags() != null && !note.getTags().isBlank()
                ? Arrays.asList(note.getTags().split(","))
                : List.of();

        return NoteResponse.builder()
                .id(note.getId())
                .userId(note.getUser().getId())
                .date(note.getDate())
                .title(note.getTitle())
                .content(note.getContent())
                .tags(tagList)
                .createdAt(note.getCreatedAt())
                .updatedAt(note.getUpdatedAt())
                .build();
    }
}
