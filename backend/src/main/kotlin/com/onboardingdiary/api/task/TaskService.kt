package com.onboardingdiary.api.task

import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.security.requireRole
import com.onboardingdiary.task.TaskEntry
import com.onboardingdiary.task.TaskFilter
import com.onboardingdiary.task.TaskPriority
import com.onboardingdiary.task.TaskRepository
import com.onboardingdiary.task.TaskStateMachine
import com.onboardingdiary.task.TaskStatus
import com.onboardingdiary.user.Role
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Task log use cases (REQ-FUNC-030..036). Access order is fixed: role check
 * (403) before ownership lookup (404), so a manager PUT on any id is 403 and a
 * recruit touching a foreign id is 404.
 */
@Service
class TaskService(
    private val tasks: TaskRepository,
    private val scope: RecruitScopeResolver,
) {

    suspend fun list(principal: AuthenticatedUser, recruitId: UUID?, filter: TaskFilter, page: PageRequest): Page<TaskResponse> {
        val target = scope.resolveTargetRecruit(principal, recruitId)
        return withContext(Dispatchers.IO) { tasks.search(target, filter, page) }.map(TaskResponse::from)
    }

    suspend fun create(principal: AuthenticatedUser, req: CreateTaskRequest): TaskResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val created = withContext(Dispatchers.IO) {
            tasks.insert(
                recruitId = principal.id,
                entryDate = req.entryDate!!,
                title = req.title!!.trim(),
                description = req.description?.takeIf { it.isNotBlank() },
                category = req.category!!,
                status = req.status ?: TaskStatus.TODO,
                priority = req.priority ?: TaskPriority.MEDIUM,
            )
        }
        return TaskResponse.from(created)
    }

    suspend fun get(principal: AuthenticatedUser, id: UUID): TaskResponse =
        TaskResponse.from(findVisible(principal, id))

    suspend fun update(principal: AuthenticatedUser, id: UUID, req: UpdateTaskRequest): TaskResponse {
        principal.requireRole(Role.NEW_RECRUIT)
        val existing = findVisible(principal, id)
        TaskStateMachine.INSTANCE.requireTransition(existing.status, req.status!!)
        val updated = withContext(Dispatchers.IO) {
            tasks.update(
                id = id,
                entryDate = req.entryDate!!,
                title = req.title!!.trim(),
                description = req.description?.takeIf { it.isNotBlank() },
                category = req.category!!,
                status = req.status,
                priority = req.priority!!,
            )
        } ?: throw NotFoundException()
        return TaskResponse.from(updated)
    }

    suspend fun delete(principal: AuthenticatedUser, id: UUID) {
        principal.requireRole(Role.NEW_RECRUIT, Role.ADMIN)
        findVisible(principal, id)
        val deleted = withContext(Dispatchers.IO) { tasks.delete(id) }
        if (!deleted) throw NotFoundException()
    }

    /** Loads an entry the principal may read; unknown and foreign ids are both 404. */
    private suspend fun findVisible(principal: AuthenticatedUser, id: UUID): TaskEntry {
        val entry = withContext(Dispatchers.IO) { tasks.findById(id) } ?: throw NotFoundException()
        if (!scope.canRead(principal, entry.recruitId)) throw NotFoundException()
        return entry
    }
}
