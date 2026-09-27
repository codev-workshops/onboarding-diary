package com.onboardingdiary.api.task

import com.onboardingdiary.task.TaskCategory
import com.onboardingdiary.task.TaskEntry
import com.onboardingdiary.task.TaskPriority
import com.onboardingdiary.task.TaskStatus
import com.onboardingdiary.validation.ValidEntryDate
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** `TaskCreateRequest`: `status` / `priority` are optional and default to TODO / MEDIUM. */
data class CreateTaskRequest(
    @field:NotNull @field:ValidEntryDate val entryDate: LocalDate?,
    @field:NotBlank @field:Size(max = 200) val title: String?,
    @field:Size(max = 4000) val description: String? = null,
    @field:NotNull val category: TaskCategory?,
    val status: TaskStatus? = null,
    val priority: TaskPriority? = null,
)

/** `TaskUpdateRequest`: full replacement, every field required except `description`. */
data class UpdateTaskRequest(
    @field:NotNull @field:ValidEntryDate val entryDate: LocalDate?,
    @field:NotBlank @field:Size(max = 200) val title: String?,
    @field:Size(max = 4000) val description: String? = null,
    @field:NotNull val category: TaskCategory?,
    @field:NotNull val status: TaskStatus?,
    @field:NotNull val priority: TaskPriority?,
)

data class TaskResponse(
    val id: UUID,
    val recruitId: UUID,
    val entryDate: LocalDate,
    val title: String,
    val description: String?,
    val category: TaskCategory,
    val status: TaskStatus,
    val priority: TaskPriority,
    val createdAt: Instant,
    val updatedAt: Instant,
) {
    companion object {
        fun from(t: TaskEntry) = TaskResponse(
            id = t.id,
            recruitId = t.recruitId,
            entryDate = t.entryDate,
            title = t.title,
            description = t.description,
            category = t.category,
            status = t.status,
            priority = t.priority,
            createdAt = t.createdAt,
            updatedAt = t.updatedAt,
        )
    }
}
