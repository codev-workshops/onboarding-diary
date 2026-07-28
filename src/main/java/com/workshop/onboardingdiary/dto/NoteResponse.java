package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.AdditionalNote;
import java.time.LocalDate;
import java.util.List;

public record NoteResponse(Long id, Long ownerId,
                           @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                           LocalDate entryDate,
                           String title, String content, List<String> tags) {

    public static NoteResponse from(AdditionalNote note) {
        return new NoteResponse(note.getId(), note.getOwner().getId(), note.getEntryDate(), note.getTitle(),
                note.getContent(), note.getTags().stream().sorted().toList());
    }
}
