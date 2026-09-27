package com.onboardingdiary.api.assignment

import com.onboardingdiary.api.auth.UserSummary
import com.onboardingdiary.assignment.Assignment
import com.onboardingdiary.assignment.AssignmentStatus
import com.onboardingdiary.user.User
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class CreateAssignmentRequest(
    @field:NotNull val recruitId: UUID?,
    @field:NotNull val managerId: UUID?,
    @field:Size(max = 500) val note: String? = null,
)

/** `Assignment` schema: parties are embedded summaries, never raw users. */
data class AssignmentResponse(
    val id: UUID,
    val recruit: UserSummary,
    val manager: UserSummary,
    val assignedBy: UserSummary,
    val status: AssignmentStatus,
    val assignedAt: Instant,
    val endedAt: Instant?,
    val note: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    companion object {
        fun from(a: Assignment, users: Map<UUID, User>) = AssignmentResponse(
            id = a.id,
            recruit = UserSummary.from(users.getValue(a.recruitId)),
            manager = UserSummary.from(users.getValue(a.managerId)),
            assignedBy = UserSummary.from(users.getValue(a.assignedById)),
            status = a.status,
            assignedAt = a.assignedAt,
            endedAt = a.endedAt,
            note = a.note,
            createdAt = a.createdAt,
            updatedAt = a.updatedAt,
        )
    }
}

data class AssignmentResult(val assignment: AssignmentResponse, val superseded: AssignmentResponse?)

data class MyManagerResponse(val assignment: AssignmentResponse?)

/** `openIssueCount` is populated by the issues slice; 0 until then. */
data class AssignedRecruit(val recruit: UserSummary, val assignedAt: Instant, val openIssueCount: Int = 0)
