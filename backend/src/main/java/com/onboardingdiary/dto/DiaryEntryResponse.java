package com.onboardingdiary.dto;

import com.onboardingdiary.model.DiaryEntry;

import java.time.LocalDateTime;

public record DiaryEntryResponse(
    Long id,
    String title,
    String content,
    boolean isPublic,
    String authorUsername,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static DiaryEntryResponse from(DiaryEntry entry) {
        return new DiaryEntryResponse(
            entry.getId(),
            entry.getTitle(),
            entry.getContent(),
            entry.isPublic(),
            entry.getUser().getUsername(),
            entry.getCreatedAt(),
            entry.getUpdatedAt()
        );
    }
}
