package com.onboardingdiary.api.feedback

import com.onboardingdiary.api.error.ConflictException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.feedback.FeedbackFilter
import com.onboardingdiary.feedback.FeedbackNote
import com.onboardingdiary.feedback.FeedbackRepository
import com.onboardingdiary.feedback.FeedbackVisibility
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.security.requireRole
import com.onboardingdiary.user.Role
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Feedback note use cases (REQ-FUNC-050..054). Access order is fixed: role
 * check (403) before visibility lookup (404), so a manager PUT on any id is
 * 403 while a non-visible id on GET/DELETE is 404. Lists resolve the target
 * recruit through [RecruitScopeResolver] (403 NOT_ASSIGNED for a manager
 * without an active assignment); single notes go through [FeedbackVisibility].
 */
@Service
class FeedbackService(
    private val feedback: FeedbackRepository,
    private val scope: RecruitScopeResolver,
    private val visibility: FeedbackVisibility,
) {
    private companion object {
        const val MAX_UPDATE_ATTEMPTS = 3
    }

    suspend fun list(principal: AuthenticatedUser, recruitId: UUID?, filter: FeedbackFilter, page: PageRequest): Page<FeedbackResponse> {
        val target = scope.resolveTargetRecruit(principal, recruitId)
        return withContext(Dispatchers.IO) { feedback.search(target, filter, page) }.map(FeedbackResponse::from)
    }

    suspend fun create(principal: AuthenticatedUser, req: FeedbackRequest): FeedbackResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val created = withContext(Dispatchers.IO) {
            feedback.insert(
                recruitId = principal.id,
                entryDate = req.entryDate!!,
                subject = req.subject!!.trim(),
                type = req.type!!,
                details = req.details!!.trim(),
            )
        }
        return FeedbackResponse.from(created)
    }

    suspend fun get(principal: AuthenticatedUser, id: UUID): FeedbackResponse =
        FeedbackResponse.from(findVisible(principal, id))

    /**
     * Full replacement guarded by the row `version`. With [expectedVersion]
     * (from `If-Match`) a stale client gets 409 CONFLICT; without it a lost CAS
     * race is retried against the fresh row.
     */
    suspend fun update(principal: AuthenticatedUser, id: UUID, req: FeedbackRequest, expectedVersion: Long? = null): FeedbackResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        repeat(MAX_UPDATE_ATTEMPTS) {
            val existing = findVisible(principal, id)
            if (expectedVersion != null && expectedVersion != existing.version) throw ConflictException()
            val written = withContext(Dispatchers.IO) {
                feedback.update(
                    id = id,
                    entryDate = req.entryDate!!,
                    subject = req.subject!!.trim(),
                    type = req.type!!,
                    details = req.details!!.trim(),
                    expectedVersion = existing.version,
                )
            }
            if (written != null) return FeedbackResponse.from(written)
            if (expectedVersion != null) throw ConflictException()
        }
        throw ConflictException()
    }

    suspend fun delete(principal: AuthenticatedUser, id: UUID) {
        principal.requireRole(Role.NEW_RECRUIT, Role.ADMIN)
        findVisible(principal, id)
        val deleted = withContext(Dispatchers.IO) { feedback.delete(id) }
        if (!deleted) throw NotFoundException()
    }

    /** Loads a note the principal may read (D3); unknown and non-visible ids are both 404. */
    private suspend fun findVisible(principal: AuthenticatedUser, id: UUID): FeedbackNote {
        val note = withContext(Dispatchers.IO) { feedback.findById(id) } ?: throw NotFoundException()
        visibility.requireCanRead(principal, note.recruitId)
        return note
    }
}
