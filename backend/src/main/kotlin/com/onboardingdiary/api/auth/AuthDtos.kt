package com.onboardingdiary.api.auth

import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserStatus
import com.onboardingdiary.validation.ValidEmail
import com.onboardingdiary.validation.ValidPassword
import com.onboardingdiary.validation.ValidStartDate
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class SignupRequest(
    @field:NotBlank @field:ValidEmail @field:Size(max = 254)
    val email: String?,
    @field:NotNull @field:ValidPassword
    val password: String?,
    @field:Size(min = 1, max = 100)
    val fullName: String? = null,
    @field:Size(max = 100)
    val department: String? = null,
    @field:ValidStartDate
    val startDate: LocalDate? = null,
) {
    override fun toString(): String = "SignupRequest(email=$email)"
}

data class LoginRequest(
    @field:NotBlank @field:ValidEmail @field:Size(max = 254)
    val email: String?,
    @field:NotBlank
    val password: String?,
) {
    override fun toString(): String = "LoginRequest(email=$email)"
}

data class ChangePasswordRequest(
    @field:NotBlank
    val currentPassword: String?,
    @field:NotNull @field:ValidPassword
    val newPassword: String?,
) {
    override fun toString(): String = "ChangePasswordRequest(****)"
}

data class ProfileUpdateRequest(
    @field:Size(min = 1, max = 100)
    val fullName: String? = null,
    @field:Size(max = 100)
    val department: String? = null,
    @field:ValidStartDate
    val startDate: LocalDate? = null,
)

data class AuthResponse(val token: String, val expiresAt: Instant, val user: UserProfile)

data class UserSummary(
    val id: UUID,
    val email: String,
    val fullName: String,
    val role: Role,
    val status: UserStatus,
    val department: String?,
    val startDate: LocalDate?,
) {
    companion object {
        fun from(u: User) = UserSummary(u.id, u.email, u.fullName, u.role, u.status, u.department, u.startDate)
    }
}

/** Never carries `passwordHash`: built field-by-field from [User]. */
data class UserProfile(
    val id: UUID,
    val email: String,
    val fullName: String,
    val role: Role,
    val status: UserStatus,
    val department: String?,
    val startDate: LocalDate?,
    val invitedAt: Instant,
    val activatedAt: Instant?,
    val createdBy: UserSummary?,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    companion object {
        fun from(u: User, createdBy: User?) = UserProfile(
            id = u.id,
            email = u.email,
            fullName = u.fullName,
            role = u.role,
            status = u.status,
            department = u.department,
            startDate = u.startDate,
            invitedAt = u.invitedAt,
            activatedAt = u.activatedAt,
            createdBy = createdBy?.let { UserSummary.from(it) },
            createdAt = u.createdAt,
            updatedAt = u.updatedAt,
        )
    }
}
