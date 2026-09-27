package com.onboardingdiary.api.admin

import com.onboardingdiary.api.auth.UserSummary
import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.security.requireRole
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/users")
class UserAdminController(private val service: UserAdminService) {

    /** operationId: listUsers */
    @GetMapping
    suspend fun list(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam role: String?,
        @RequestParam status: String?,
        @RequestParam q: String?,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
        @RequestParam sort: String?,
    ): Page<UserSummary> {
        principal.requireRole(Role.ADMIN)
        if (q != null && q.length > 100) {
            throw ApiException(
                ErrorCode.VALIDATION_FAILED,
                details = listOf(ErrorDetail("q", DetailCode.TOO_LONG, "must be at most 100 characters")),
            )
        }
        return service.list(enumParam<Role>("role", role), enumParam<UserStatus>("status", status), q, PageRequest.parse(page, size, sort, UserRepository.USER_SORT))
    }

    /** operationId: createUser */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    suspend fun create(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: CreateUserRequest,
    ): UserDetail {
        principal.requireRole(Role.ADMIN)
        return service.create(principal.id, request)
    }

    /** operationId: getUser */
    @GetMapping("/{userId}")
    suspend fun get(@AuthenticationPrincipal principal: AuthenticatedUser, @PathVariable userId: UUID): UserDetail {
        principal.requireRole(Role.ADMIN)
        return service.detail(userId)
    }

    /** operationId: updateUser */
    @PatchMapping("/{userId}")
    suspend fun update(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable userId: UUID,
        @Valid @RequestBody request: AdminUserUpdateRequest,
    ): UserDetail {
        principal.requireRole(Role.ADMIN)
        return service.update(userId, request)
    }

    /** operationId: deactivateUser */
    @PostMapping("/{userId}/deactivate")
    suspend fun deactivate(@AuthenticationPrincipal principal: AuthenticatedUser, @PathVariable userId: UUID): UserDetail {
        principal.requireRole(Role.ADMIN)
        return service.deactivate(principal.id, userId)
    }

    /** operationId: reactivateUser */
    @PostMapping("/{userId}/reactivate")
    suspend fun reactivate(@AuthenticationPrincipal principal: AuthenticatedUser, @PathVariable userId: UUID): UserDetail {
        principal.requireRole(Role.ADMIN)
        return service.reactivate(principal.id, userId)
    }
}
