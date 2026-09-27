package com.onboardingdiary.api.task

import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.entry.DateRangeFilter
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.task.TaskCategory
import com.onboardingdiary.task.TaskFilter
import com.onboardingdiary.task.TaskRepository
import com.onboardingdiary.task.TaskStatus
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/tasks")
class TaskController(private val service: TaskService) {

    /** operationId: listTasks */
    @GetMapping
    suspend fun list(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam recruitId: UUID?,
        @RequestParam from: String?,
        @RequestParam to: String?,
        @RequestParam category: String?,
        @RequestParam status: String?,
        @RequestParam page: Int?,
        @RequestParam size: Int?,
        @RequestParam sort: String?,
    ): Page<TaskResponse> {
        val filter = TaskFilter(
            range = DateRangeFilter.parse(from, to),
            category = enumParam<TaskCategory>("category", category),
            status = enumParam<TaskStatus>("status", status),
        )
        return service.list(principal, recruitId, filter, PageRequest.parse(page, size, sort, TaskRepository.TASK_SORT))
    }

    /** operationId: createTask */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    suspend fun create(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @Valid @RequestBody request: CreateTaskRequest,
    ): TaskResponse = service.create(principal, request)

    /** operationId: getTask */
    @GetMapping("/{taskId}")
    suspend fun get(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable taskId: UUID,
    ): TaskResponse = service.get(principal, taskId)

    /** operationId: updateTask */
    @PutMapping("/{taskId}")
    suspend fun update(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable taskId: UUID,
        @Valid @RequestBody request: UpdateTaskRequest,
    ): TaskResponse = service.update(principal, taskId, request)

    /** operationId: deleteTask */
    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    suspend fun delete(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @PathVariable taskId: UUID,
    ) = service.delete(principal, taskId)
}
