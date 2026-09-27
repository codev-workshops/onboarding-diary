package com.onboardingdiary.task

import com.onboardingdiary.entry.StateMachine
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

enum class TaskCategory { TRAINING, SETUP, DEVELOPMENT, MEETING, DOCUMENTATION, OTHER }

enum class TaskStatus { TODO, IN_PROGRESS, BLOCKED, DONE }

enum class TaskPriority { LOW, MEDIUM, HIGH }

/** Task lifecycle from docs/detailed-requirements.md §1.4 (INV-08). */
object TaskStateMachine {
    val INSTANCE: StateMachine<TaskStatus> = StateMachine(
        mapOf(
            TaskStatus.TODO to setOf(TaskStatus.IN_PROGRESS, TaskStatus.DONE),
            TaskStatus.IN_PROGRESS to setOf(TaskStatus.BLOCKED, TaskStatus.DONE),
            TaskStatus.BLOCKED to setOf(TaskStatus.IN_PROGRESS, TaskStatus.TODO),
            TaskStatus.DONE to setOf(TaskStatus.IN_PROGRESS),
        ),
    )
}

/** Row of the `task_entries` table. */
data class TaskEntry(
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
)
