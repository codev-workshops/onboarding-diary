package com.codev.onboardingdiary.entry.note;

import java.time.LocalDate;

/** Optional list filters; null fields are ignored. */
public record NoteFilter(LocalDate from, LocalDate to, String tag) {}
