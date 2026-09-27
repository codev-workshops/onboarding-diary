package com.onboardingdiary.assignment

import java.time.Instant
import java.util.UUID

enum class AssignmentStatus { ACTIVE, REASSIGNED }

data class Assignment(
    val id: UUID,
    val recruitId: UUID,
    val managerId: UUID,
    val assignedById: UUID,
    val status: AssignmentStatus,
    val assignedAt: Instant,
    val endedAt: Instant?,
    val note: String?,
    val createdAt: Instant,
    val updatedAt: Instant,
)
