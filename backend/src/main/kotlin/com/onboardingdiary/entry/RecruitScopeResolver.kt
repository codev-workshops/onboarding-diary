package com.onboardingdiary.entry

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import com.onboardingdiary.api.error.ForbiddenException
import com.onboardingdiary.api.error.NotAssignedException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.assignment.AssignmentGuard
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.UserRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Frozen access rules shared by every recruit-owned entry resource (tasks,
 * issues, feedback, dashboard, reports). Slices call these; they never
 * re-implement the role matrix.
 *
 * - [resolveTargetRecruit]: whose entries does a list/create target?
 *   recruit -> self (a foreign `recruitId` is 403 FORBIDDEN);
 *   manager -> the given recruit if actively assigned, else 403 NOT_ASSIGNED;
 *   admin   -> any existing recruit.
 * - [canRead]: may the principal see one entry owned by `ownerId`? Callers
 *   turn `false` into 404 so foreign ids are indistinguishable from unknown ones.
 */
@Component
class RecruitScopeResolver(private val guard: AssignmentGuard, private val users: UserRepository) {

    suspend fun resolveTargetRecruit(principal: AuthenticatedUser, recruitId: UUID?): UUID = when (principal.role) {
        Role.NEW_RECRUIT -> {
            if (recruitId != null && recruitId != principal.id) throw ForbiddenException()
            principal.id
        }
        Role.MANAGER -> {
            val target = recruitId ?: throw missingRecruitId()
            if (!guard.isActivelyAssigned(principal.id, target)) throw NotAssignedException()
            target
        }
        Role.ADMIN -> {
            val target = recruitId ?: throw missingRecruitId()
            val user = withContext(Dispatchers.IO) { users.findById(target) } ?: throw NotFoundException()
            if (user.role != Role.NEW_RECRUIT) throw NotFoundException()
            target
        }
    }

    suspend fun canRead(principal: AuthenticatedUser, ownerId: UUID): Boolean = when (principal.role) {
        Role.NEW_RECRUIT -> ownerId == principal.id
        Role.MANAGER -> guard.isActivelyAssigned(principal.id, ownerId)
        Role.ADMIN -> true
    }

    private fun missingRecruitId() = ApiException(
        ErrorCode.VALIDATION_FAILED,
        details = listOf(ErrorDetail("recruitId", DetailCode.REQUIRED, "is required for managers and admins")),
    )
}
