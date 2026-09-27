package com.onboardingdiary.note

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** Row of `additional_notes` joined with its `note_tags` (sorted, normalized). */
data class AdditionalNote(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val title: String,
    val content: String,
    val tags: List<String>,
    /** Optimistic-lock counter, bumped on every update; surfaced as the ETag. */
    val version: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)
