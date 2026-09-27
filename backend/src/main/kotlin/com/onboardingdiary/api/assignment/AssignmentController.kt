package com.onboardingdiary.api.assignment

import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.assignment.AssignmentRepository
import com.onboardingdiary.assignment.AssignmentStatus
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.security.requireRole
import com.onboardingdiary.user.Role
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1")
class AssignmentController(private val service: AssignmentService) {

    /** operationId: listAssignments */
    @GetMapping("/assignments")
    suspend fun list(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam recruitId: UUID?,
        @RequestParam managerId: UUID?,
        @RequestParam status: String?,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
        @RequestParam sort: String?,
    ): Page<AssignmentResponse> {
        principal.requireRole(Role.ADMIN)
        return service.list(recruitId, managerId, enumParam<AssignmentStatus>("status", status), PageRequest.parse(page, size, sort, AssignmentRepository.ASSIGNMENT_SORT))
    }

    /** operationId: assignManager */
    @PostMapping("/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    suspend fun assign(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: CreateAssignmentRequest,
    ): AssignmentResult {
        principal.requireRole(Role.ADMIN)
        return service.assign(principal.id, request)
    }

    /** operationId: listAssignmentHistory */
    @GetMapping("/users/{userId}/assignments")
    suspend fun history(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable userId: UUID,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
    ): Page<AssignmentResponse> {
        principal.requireRole(Role.ADMIN)
        return service.history(userId, PageRequest.parse(page, size, null, AssignmentRepository.HISTORY_SORT))
    }

    /** operationId: listMyRecruits */
    @GetMapping("/me/recruits")
    suspend fun myRecruits(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
        @RequestParam sort: String?,
    ): Page<AssignedRecruit> {
        principal.requireRole(Role.MANAGER)
        return service.myRecruits(principal.id, PageRequest.parse(page, size, sort, AssignmentRepository.MY_RECRUITS_SORT))
    }

    /** operationId: getMyManager */
    @GetMapping("/me/manager")
    suspend fun myManager(@AuthenticationPrincipal principal: AuthenticatedUser): MyManagerResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        return service.myManager(principal.id)
    }
}
