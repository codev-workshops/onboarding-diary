package com.onboardingdiary.user

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class Role { NEW_RECRUIT, MANAGER, ADMIN }

enum class UserStatus { INVITED, ACTIVE, DEACTIVATED }

/**
 * Row of the `users` table. `passwordHash` never leaves the persistence /
 * service layer: it is excluded from `toString()` and never mapped to a DTO.
 */
class User(
    val id: UUID,
    val email: String,
    val passwordHash: String?,
    val role: Role,
    val status: UserStatus,
    val fullName: String,
    val department: String?,
    val startDate: LocalDate?,
    val createdById: UUID?,
    val invitedAt: Instant,
    val activatedAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    override fun toString(): String = "User(id=$id, role=$role, status=$status)"
}
