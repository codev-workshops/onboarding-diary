package com.onboardingdiary.api.issue

import com.onboardingdiary.api.error.ConflictException
import com.onboardingdiary.api.error.InvalidStateTransitionException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.issue.IssueEntry
import com.onboardingdiary.issue.IssueFilter
import com.onboardingdiary.issue.IssueRepository
import com.onboardingdiary.issue.IssueStateMachine
import com.onboardingdiary.issue.IssueStatus
import com.onboardingdiary.issue.ResolutionNotesRule
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.security.requireRole
import com.onboardingdiary.user.Role
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Issue log use cases (REQ-FUNC-040..046). Access order is fixed: role check
 * (403) before ownership lookup (404), so a manager PUT on any id is 403 and a
 * recruit touching a foreign id is 404. Rule order on write: state transition
 * (INVALID_STATE_TRANSITION) before INV-07 (RESOLUTION_NOTES_REQUIRED).
 */
@Service
class IssueService(
    private val issues: IssueRepository,
    private val scope: RecruitScopeResolver,
) {
    private companion object {
        const val MAX_UPDATE_ATTEMPTS = 3
    }

    suspend fun list(principal: AuthenticatedUser, recruitId: UUID?, filter: IssueFilter, page: PageRequest): Page<IssueResponse> {
        val target = scope.resolveTargetRecruit(principal, recruitId)
        return withContext(Dispatchers.IO) { issues.search(target, filter, page) }.map(IssueResponse::from)
    }

    suspend fun create(principal: AuthenticatedUser, req: CreateIssueRequest): IssueResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val status = req.status ?: IssueStatus.OPEN
        val notes = req.resolutionNotes?.takeIf { it.isNotBlank() }
        ResolutionNotesRule.require(status, notes)
        val created = withContext(Dispatchers.IO) {
            issues.insert(
                recruitId = principal.id,
                entryDate = req.entryDate!!,
                title = req.title!!.trim(),
                description = req.description?.takeIf { it.isNotBlank() },
                severity = req.severity!!,
                status = status,
                resolutionNotes = notes,
            )
        }
        return IssueResponse.from(created)
    }

    suspend fun get(principal: AuthenticatedUser, id: UUID): IssueResponse =
        IssueResponse.from(findVisible(principal, id))

    /**
     * Full replacement guarded by the row `version`. With [expectedVersion]
     * (from `If-Match`) a stale client gets 409 CONFLICT instead of silently
     * overwriting a concurrent edit; without it, a lost CAS race is retried
     * against the fresh row so the state machine is still enforced.
     */
    suspend fun update(principal: AuthenticatedUser, id: UUID, req: UpdateIssueRequest, expectedVersion: Long? = null): IssueResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val status = req.status!!
        val notes = req.resolutionNotes?.takeIf { it.isNotBlank() }
        repeat(MAX_UPDATE_ATTEMPTS) {
            val existing = findVisible(principal, id)
            if (expectedVersion != null && expectedVersion != existing.version) throw ConflictException()
            IssueStateMachine.INSTANCE.requireTransition(existing.status, status)
            ResolutionNotesRule.require(status, notes)
            val applied = withContext(Dispatchers.IO) {
                issues.update(
                    id = id,
                    entryDate = req.entryDate!!,
                    title = req.title!!.trim(),
                    description = req.description?.takeIf { it.isNotBlank() },
                    severity = req.severity!!,
                    status = status,
                    resolutionNotes = notes,
                    expectedVersion = existing.version,
                )
            }
            if (applied) return IssueResponse.from(findVisible(principal, id))
            if (expectedVersion != null) throw ConflictException()
        }
        val latest = findVisible(principal, id)
        if (IssueStateMachine.INSTANCE.canTransition(latest.status, status)) throw ConflictException()
        throw InvalidStateTransitionException(latest.status.name, status.name)
    }

    suspend fun delete(principal: AuthenticatedUser, id: UUID) {
        principal.requireRole(Role.NEW_RECRUIT, Role.ADMIN)
        findVisible(principal, id)
        val deleted = withContext(Dispatchers.IO) { issues.delete(id) }
        if (!deleted) throw NotFoundException()
    }

    /** Loads an entry the principal may read; unknown and foreign ids are both 404. */
    private suspend fun findVisible(principal: AuthenticatedUser, id: UUID): IssueEntry {
        val entry = withContext(Dispatchers.IO) { issues.findById(id) } ?: throw NotFoundException()
        if (!scope.canRead(principal, entry.recruitId)) throw NotFoundException()
        return entry
    }
}
