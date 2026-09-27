package com.onboardingdiary.feedback

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class FeedbackType { POSITIVE, SUGGESTION, CONCERN }

/** Row of the `feedback_notes` table (REQ-FUNC-050). No status lifecycle. */
data class FeedbackNote(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val subject: String,
    val type: FeedbackType,
    val details: String,
    /** Optimistic-lock counter, bumped on every update; surfaced as the ETag. */
    val version: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)
