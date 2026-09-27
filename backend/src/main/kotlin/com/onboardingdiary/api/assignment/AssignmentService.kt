package com.onboardingdiary.api.assignment

import com.onboardingdiary.api.auth.UserSummary
import com.onboardingdiary.api.error.ConflictException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.assignment.Assignment
import com.onboardingdiary.assignment.AssignmentPolicy
import com.onboardingdiary.assignment.AssignmentRepository
import com.onboardingdiary.assignment.AssignmentStatus
import com.onboardingdiary.assignment.AssignmentTransition
import com.onboardingdiary.user.LockMode
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.dao.DuplicateKeyException
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.util.UUID

@Service
class AssignmentService(
    private val assignments: AssignmentRepository,
    private val users: UserRepository,
    private val transactionTemplate: TransactionTemplate,
) {
    private val log = LoggerFactory.getLogger(AssignmentService::class.java)

    /**
     * Assign or atomically reassign (REQ-FUNC-016..018). Party validation,
     * ending the previous row and inserting the new one all run inside ONE
     * `transactionTemplate.execute` on a single connection, inside one
     * `withContext(Dispatchers.IO)`; the partial unique index turns a lost
     * race into `409 CONFLICT`. Both parties are locked `FOR SHARE` so a concurrent admin
     * role change / deactivation (`FOR UPDATE`) cannot interleave with the party checks.
     */
    suspend fun assign(adminId: UUID, request: CreateAssignmentRequest): AssignmentResult {
        val recruitId = request.recruitId!!
        val managerId = request.managerId!!
        val note = request.note?.trim()?.takeIf { it.isNotEmpty() }

        val (created, superseded) = withContext(Dispatchers.IO) {
            try {
                transactionTemplate.execute {
                    val recruit = users.lockById(recruitId, LockMode.SHARE) ?: throw NotFoundException()
                    val manager = users.lockById(managerId, LockMode.SHARE) ?: throw NotFoundException()
                    AssignmentPolicy.validateParties(recruit, manager)

                    val previous = when (val t = AssignmentPolicy.transition(assignments.findActiveByRecruit(recruitId), managerId)) {
                        AssignmentTransition.Assign -> null
                        is AssignmentTransition.Reassign -> assignments.end(t.previous.id) ?: throw ConflictException()
                    }
                    val created = assignments.insertActive(recruitId, managerId, adminId, note)
                    created to previous
                }!!
            } catch (e: DuplicateKeyException) {
                throw ConflictException()
            }
        }
        log.info("Assignment {} created for recruit {} -> manager {} (superseded {})", created.id, recruitId, managerId, superseded?.id)
        val lookup = withContext(Dispatchers.IO) { partiesOf(listOfNotNull(created, superseded)) }
        return AssignmentResult(AssignmentResponse.from(created, lookup), superseded?.let { AssignmentResponse.from(it, lookup) })
    }

    suspend fun list(recruitId: UUID?, managerId: UUID?, status: AssignmentStatus?, page: PageRequest): Page<AssignmentResponse> =
        withContext(Dispatchers.IO) { hydrate(assignments.search(recruitId, managerId, status, page)) }

    suspend fun history(recruitId: UUID, page: PageRequest): Page<AssignmentResponse> = withContext(Dispatchers.IO) {
        users.findById(recruitId) ?: throw NotFoundException()
        hydrate(assignments.search(recruitId, null, null, page))
    }

    suspend fun myManager(recruitId: UUID): MyManagerResponse = withContext(Dispatchers.IO) {
        val current = assignments.findActiveByRecruit(recruitId)
        MyManagerResponse(current?.let { AssignmentResponse.from(it, partiesOf(listOf(it))) })
    }

    suspend fun myRecruits(managerId: UUID, page: PageRequest): Page<AssignedRecruit> = withContext(Dispatchers.IO) {
        assignments.activeRecruitsForManager(managerId, page).map { AssignedRecruit(UserSummary.from(it.recruit), it.assignedAt) }
    }

    /** Current ACTIVE assignment of a recruit as a response DTO (used by the admin user detail). */
    fun currentAssignmentBlocking(recruitId: UUID): AssignmentResponse? =
        assignments.findActiveByRecruit(recruitId)?.let { AssignmentResponse.from(it, partiesOf(listOf(it))) }

    private fun hydrate(page: Page<Assignment>): Page<AssignmentResponse> {
        val lookup = partiesOf(page.items)
        return page.map { AssignmentResponse.from(it, lookup) }
    }

    private fun partiesOf(rows: List<Assignment>): Map<UUID, User> =
        users.findByIds(rows.flatMap { listOf(it.recruitId, it.managerId, it.assignedById) })
}
