package com.onboardingdiary.issue

import com.onboardingdiary.api.error.ResolutionNotesRequiredException
import com.onboardingdiary.entry.StateMachine
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class IssueSeverity { LOW, MEDIUM, HIGH, CRITICAL }

enum class IssueStatus { OPEN, IN_PROGRESS, RESOLVED, CLOSED }

/** Issue lifecycle from docs/detailed-requirements.md §1.4. */
object IssueStateMachine {
    val INSTANCE: StateMachine<IssueStatus> = StateMachine(
        mapOf(
            IssueStatus.OPEN to setOf(IssueStatus.IN_PROGRESS, IssueStatus.RESOLVED),
            IssueStatus.IN_PROGRESS to setOf(IssueStatus.RESOLVED),
            IssueStatus.RESOLVED to setOf(IssueStatus.CLOSED, IssueStatus.IN_PROGRESS),
            IssueStatus.CLOSED to setOf(IssueStatus.IN_PROGRESS),
        ),
    )
}

/** INV-07: `status ∈ {RESOLVED, CLOSED}` ⇒ `resolutionNotes` is non-blank (422 RESOLUTION_NOTES_REQUIRED). */
object ResolutionNotesRule {
    val REQUIRING_STATUSES: Set<IssueStatus> = setOf(IssueStatus.RESOLVED, IssueStatus.CLOSED)

    fun requiresNotes(status: IssueStatus): Boolean = status in REQUIRING_STATUSES

    fun isSatisfied(status: IssueStatus, resolutionNotes: String?): Boolean =
        !requiresNotes(status) || !resolutionNotes.isNullOrBlank()

    fun require(status: IssueStatus, resolutionNotes: String?) {
        if (!isSatisfied(status, resolutionNotes)) throw ResolutionNotesRequiredException()
    }
}

/** Row of the `issue_entries` table. */
data class IssueEntry(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val title: String,
    val description: String?,
    val severity: IssueSeverity,
    val status: IssueStatus,
    val resolutionNotes: String?,
    /** Optimistic-lock counter, bumped on every update; surfaced as the ETag. */
    val version: Long,
    val createdAt: Instant,
    val updatedAt: Instant,
)
