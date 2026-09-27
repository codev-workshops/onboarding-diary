package com.onboardingdiary.api.admin

import com.onboardingdiary.api.assignment.AssignmentService
import com.onboardingdiary.api.auth.UserSummary
import com.onboardingdiary.api.error.CannotDeactivateSelfException
import com.onboardingdiary.api.error.EmailAlreadyExistsException
import com.onboardingdiary.api.error.EmailLockedException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.api.error.RoleChangeBlockedByAssignmentException
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.assignment.AssignmentRepository
import com.onboardingdiary.user.LockMode
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserRepository
import com.onboardingdiary.user.UserStatus
import com.onboardingdiary.validation.EmailNormalizer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.slf4j.LoggerFactory
import org.springframework.dao.DuplicateKeyException
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.util.UUID

@Service
class UserAdminService(
    private val users: UserRepository,
    private val assignments: AssignmentRepository,
    private val assignmentService: AssignmentService,
    private val transactionTemplate: TransactionTemplate,
) {
    private val log = LoggerFactory.getLogger(UserAdminService::class.java)

    suspend fun list(role: Role?, status: UserStatus?, q: String?, page: PageRequest): Page<UserSummary> =
        withContext(Dispatchers.IO) { users.search(role, status, q, page).map { UserSummary.from(it) } }

    /** Provisions an INVITED user without a password (REQ-FUNC-012); `POST /auth/signup` completes it. */
    suspend fun create(adminId: UUID, request: CreateUserRequest): UserDetail {
        val email = EmailNormalizer.normalize(request.email)!!
        val created = withContext(Dispatchers.IO) {
            if (users.findByEmail(email) != null) throw EmailAlreadyExistsException()
            try {
                users.insert(
                    email = email,
                    passwordHash = null,
                    role = request.role!!,
                    status = UserStatus.INVITED,
                    fullName = request.fullName!!.trim(),
                    department = request.department?.trim()?.takeIf { it.isNotEmpty() },
                    startDate = request.startDate,
                    createdById = adminId,
                    activatedAt = null,
                )
            } catch (e: DuplicateKeyException) {
                throw EmailAlreadyExistsException()
            }
        }
        log.info("Admin {} invited user {} as {}", adminId, created.id, created.role)
        return detail(created.id)
    }

    suspend fun detail(userId: UUID): UserDetail = withContext(Dispatchers.IO) {
        val user = users.findById(userId) ?: throw NotFoundException()
        toDetail(user)
    }

    /**
     * REQ-FUNC-014 / 012a: email only while INVITED; role change blocked by an ACTIVE assignment (INV-11).
     * The user row is locked `FOR UPDATE` for the whole check-then-write, so a concurrent signup
     * (which updates the row) or `assign` (which locks the parties `FOR SHARE`) is serialised against it.
     */
    suspend fun update(userId: UUID, request: AdminUserUpdateRequest): UserDetail {
        val newEmail = request.email?.let { EmailNormalizer.normalize(it)!! }
        val updated = withContext(Dispatchers.IO) { transactionTemplate.execute {
            val user = users.lockById(userId, LockMode.UPDATE) ?: throw NotFoundException()

            val email = when {
                newEmail == null || newEmail == user.email -> user.email
                user.status != UserStatus.INVITED -> throw EmailLockedException()
                users.findByEmail(newEmail) != null -> throw EmailAlreadyExistsException()
                else -> newEmail
            }
            val role = request.role ?: user.role
            if (role != user.role && assignments.hasActiveAsParty(user.id)) throw RoleChangeBlockedByAssignmentException()

            try {
                users.updateAdminFields(
                    id = user.id,
                    email = email,
                    fullName = request.fullName?.trim() ?: user.fullName,
                    department = if (request.department == null) user.department else request.department.orElse(null)?.trim()?.takeIf { it.isNotEmpty() },
                    startDate = if (request.startDate == null) user.startDate else request.startDate.orElse(null),
                    role = role,
                )
            } catch (e: DuplicateKeyException) {
                throw EmailAlreadyExistsException()
            }
        }!! }
        log.info("User {} updated by admin", updated.id)
        return detail(updated.id)
    }

    /**
     * REQ-FUNC-015: an INVITED user is revoked, an ACTIVE one loses access on the next request.
     * Any ACTIVE assignment the user takes part in is closed as ENDED in the same transaction, so a
     * deactivated manager does not keep (or regain on reactivation) access to recruits, and a
     * deactivated recruit is no longer listed under a manager.
     */
    suspend fun deactivate(adminId: UUID, userId: UUID): UserDetail {
        if (adminId == userId) throw CannotDeactivateSelfException()
        val (updated, ended) = withContext(Dispatchers.IO) { transactionTemplate.execute {
            val user = users.lockById(userId, LockMode.UPDATE) ?: throw NotFoundException()
            if (user.status == UserStatus.DEACTIVATED) user to 0
            else users.updateStatus(user.id, UserStatus.DEACTIVATED) to assignments.endAllActiveForParty(user.id)
        }!! }
        log.info("User {} deactivated by admin {} ({} assignment(s) ended)", updated.id, adminId, ended)
        return detail(updated.id)
    }

    /** Back to ACTIVE when a password exists, otherwise back to INVITED (a revoked invite). */
    suspend fun reactivate(adminId: UUID, userId: UUID): UserDetail {
        val updated = withContext(Dispatchers.IO) {
            val user = users.findById(userId) ?: throw NotFoundException()
            when (user.status) {
                UserStatus.DEACTIVATED -> users.updateStatus(
                    user.id, if (user.passwordHash == null) UserStatus.INVITED else UserStatus.ACTIVE,
                )
                else -> user
            }
        }
        log.info("User {} reactivated by admin {}", updated.id, adminId)
        return detail(updated.id)
    }

    private fun toDetail(user: User): UserDetail {
        val createdBy = user.createdById?.let { users.findById(it) }
        val current = if (user.role == Role.NEW_RECRUIT) assignmentService.currentAssignmentBlocking(user.id) else null
        val count = if (user.role == Role.MANAGER) assignments.countActiveByManager(user.id) else null
        return UserDetail.from(user, createdBy, current, count)
    }
}
