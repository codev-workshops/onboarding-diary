package com.onboardingdiary.api.admin

import com.onboardingdiary.api.assignment.AssignmentResponse
import com.onboardingdiary.api.auth.UserProfile
import com.onboardingdiary.api.auth.UserSummary
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.validation.ValidEmail
import com.onboardingdiary.validation.ValidStartDate
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.Optional
import java.util.UUID

private const val NON_BLANK = ".*[^\\s\\p{Z}].*"

/** Admin provisioning (REQ-FUNC-012). No `password` property: sending one is a 400 `NOT_ALLOWED`. */
data class CreateUserRequest(
    @field:NotBlank @field:ValidEmail @field:Size(max = 254)
    val email: String?,
    @field:NotBlank @field:Size(min = 1, max = 100) @field:Pattern(regexp = NON_BLANK)
    val fullName: String?,
    @field:NotNull
    val role: Role?,
    @field:Size(max = 100)
    val department: String? = null,
    @field:ValidStartDate
    val startDate: LocalDate? = null,
)

/**
 * Admin update (REQ-FUNC-014 / 012a). Absent properties are left unchanged;
 * `department` / `startDate` accept an explicit `null` to clear, hence
 * [Optional]: `null` = absent, `Optional.empty()` = clear.
 */
data class AdminUserUpdateRequest(
    @field:Size(min = 1, max = 100) @field:Pattern(regexp = NON_BLANK)
    val fullName: String? = null,
    val department: Optional<@Size(max = 100) String>? = null,
    val startDate: Optional<@ValidStartDate LocalDate>? = null,
    val role: Role? = null,
    @field:ValidEmail @field:Size(max = 254)
    val email: String? = null,
)

/** `UserDetail` schema: profile + current ACTIVE assignment (recruits) / active recruit count (managers). */
data class UserDetail(
    val id: UUID,
    val email: String,
    val fullName: String,
    val role: Role,
    val status: com.onboardingdiary.user.UserStatus,
    val department: String?,
    val startDate: LocalDate?,
    val invitedAt: Instant,
    val activatedAt: Instant?,
    val createdBy: UserSummary?,
    val createdAt: Instant,
    val updatedAt: Instant,
    val currentAssignment: AssignmentResponse?,
    val activeRecruitCount: Long?,
) {
    companion object {
        fun from(u: User, createdBy: User?, currentAssignment: AssignmentResponse?, activeRecruitCount: Long?): UserDetail {
            val p = UserProfile.from(u, createdBy)
            return UserDetail(
                id = p.id, email = p.email, fullName = p.fullName, role = p.role, status = p.status,
                department = p.department, startDate = p.startDate, invitedAt = p.invitedAt,
                activatedAt = p.activatedAt, createdBy = p.createdBy, createdAt = p.createdAt, updatedAt = p.updatedAt,
                currentAssignment = currentAssignment, activeRecruitCount = activeRecruitCount,
            )
        }
    }
}
