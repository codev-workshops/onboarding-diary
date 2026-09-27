package com.onboardingdiary.api.note

import com.onboardingdiary.api.error.ConflictException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.note.AdditionalNote
import com.onboardingdiary.note.NoteFilter
import com.onboardingdiary.note.NoteRepository
import com.onboardingdiary.note.TagNormalizer
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.security.requireRole
import com.onboardingdiary.user.Role
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Additional-note use cases (REQ-FUNC-060..063). Access order is fixed as in
 * S3: role check (403) before ownership lookup (404). Tags are normalized
 * before any write and fully replaced on update.
 */
@Service
class NoteService(
    private val notes: NoteRepository,
    private val scope: RecruitScopeResolver,
) {
    private companion object {
        const val MAX_UPDATE_ATTEMPTS = 3
    }

    suspend fun list(principal: AuthenticatedUser, recruitId: UUID?, filter: NoteFilter, page: PageRequest): Page<NoteResponse> {
        val target = scope.resolveTargetRecruit(principal, recruitId)
        return withContext(Dispatchers.IO) { notes.search(target, filter, page) }.map(NoteResponse::from)
    }

    suspend fun create(principal: AuthenticatedUser, req: NoteRequest): NoteResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val tags = TagNormalizer.normalize(req.tags)
        val created = withContext(Dispatchers.IO) {
            notes.insert(
                recruitId = principal.id,
                entryDate = req.entryDate!!,
                title = req.title!!.trim(),
                content = req.content!!.trim(),
                tags = tags,
            )
        }
        return NoteResponse.from(created)
    }

    suspend fun get(principal: AuthenticatedUser, id: UUID): NoteResponse =
        NoteResponse.from(findVisible(principal, id))

    /**
     * Full replacement guarded by the row `version`. With [expectedVersion]
     * (from `If-Match`) a stale client gets 409 CONFLICT; without it a lost CAS
     * race is retried against the fresh row.
     */
    suspend fun update(principal: AuthenticatedUser, id: UUID, req: NoteRequest, expectedVersion: Long? = null): NoteResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val tags = TagNormalizer.normalize(req.tags)
        repeat(MAX_UPDATE_ATTEMPTS) {
            val existing = findVisible(principal, id)
            if (expectedVersion != null && expectedVersion != existing.version) throw ConflictException()
            val written = withContext(Dispatchers.IO) {
                notes.update(
                    id = id,
                    entryDate = req.entryDate!!,
                    title = req.title!!.trim(),
                    content = req.content!!.trim(),
                    tags = tags,
                    expectedVersion = existing.version,
                )
            }
            if (written != null) return NoteResponse.from(written)
            if (expectedVersion != null) throw ConflictException()
        }
        throw ConflictException()
    }

    suspend fun delete(principal: AuthenticatedUser, id: UUID) {
        principal.requireRole(Role.NEW_RECRUIT, Role.ADMIN)
        findVisible(principal, id)
        val deleted = withContext(Dispatchers.IO) { notes.delete(id) }
        if (!deleted) throw NotFoundException()
    }

    /** Loads a note the principal may read; unknown and foreign ids are both 404. */
    private suspend fun findVisible(principal: AuthenticatedUser, id: UUID): AdditionalNote {
        val note = withContext(Dispatchers.IO) { notes.findById(id) } ?: throw NotFoundException()
        if (!scope.canRead(principal, note.recruitId)) throw NotFoundException()
        return note
    }
}
