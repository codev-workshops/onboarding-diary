package com.onboardingdiary.feedback

import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.assignment.AssignmentGuard
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.user.Role
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * AUTHZ-FEEDBACK (decision D3), the shared predicate for everything that
 * exposes feedback: the `/feedback` resource (S5), dashboard feedback counts
 * (S7) and `FEEDBACK` / `COMBINED` reports (S8).
 *
 * `canRead(principal, recruitId)` = owner ∨ ADMIN ∨ (MANAGER ∧ actively assigned).
 * The assignment is looked up on every call through [AssignmentGuard], so a
 * reassignment flips the answer on the very next request (REQ-FUNC-054).
 *
 * How callers turn `false` into a response is theirs to decide:
 * - S5 detail endpoints use [requireCanRead] → 404 so non-visible ids are
 *   indistinguishable from unknown ones; the list endpoint resolves the target
 *   recruit first (`RecruitScopeResolver`, 403 NOT_ASSIGNED for managers).
 * - S7 omits the `feedback` block; S8 answers 403 for `FEEDBACK` and sets
 *   `X-Report-Omitted: feedback` for `COMBINED`.
 */
@Component
class FeedbackVisibility(private val isActivelyAssigned: suspend (managerId: UUID, recruitId: UUID) -> Boolean) {

    @Autowired
    constructor(guard: AssignmentGuard) : this(guard::isActivelyAssigned)

    suspend fun canRead(principal: AuthenticatedUser, recruitId: UUID): Boolean = when (principal.role) {
        Role.NEW_RECRUIT -> recruitId == principal.id
        Role.ADMIN -> true
        Role.MANAGER -> isActivelyAssigned(principal.id, recruitId)
    }

    /** [canRead] or 404 NOT_FOUND. */
    suspend fun requireCanRead(principal: AuthenticatedUser, recruitId: UUID) {
        if (!canRead(principal, recruitId)) throw NotFoundException()
    }
}
