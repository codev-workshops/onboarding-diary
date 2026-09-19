package com.codev.onboardingdiary.web.dto;

import java.time.LocalDate;

public record NoteFilter(LocalDate from, LocalDate to, String q) {

    public static NoteFilter empty() {
        return new NoteFilter(null, null, null);
    }
}
