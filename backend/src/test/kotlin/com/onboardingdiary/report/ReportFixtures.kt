package com.onboardingdiary.report

import com.onboardingdiary.feedback.FeedbackNote
import com.onboardingdiary.feedback.FeedbackType
import com.onboardingdiary.issue.IssueEntry
import com.onboardingdiary.issue.IssueSeverity
import com.onboardingdiary.issue.IssueStatus
import com.onboardingdiary.task.TaskCategory
import com.onboardingdiary.task.TaskEntry
import com.onboardingdiary.task.TaskPriority
import com.onboardingdiary.task.TaskStatus
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

object ReportFixtures {
    val recruitId: UUID = UUID.fromString("11111111-2222-3333-4444-555555555555")
    val recruit = ReportRecruit(recruitId, "Ada Lovelace", "ada@example.com")
    val range = ReportRange(LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-31"))
    val now: Instant = Instant.parse("2026-02-01T10:00:00Z")

    fun task(title: String, description: String? = null, date: String = "2026-01-05") = TaskEntry(
        UUID.randomUUID(), recruitId, LocalDate.parse(date), title, description,
        TaskCategory.TRAINING, TaskStatus.TODO, TaskPriority.MEDIUM, 1, now, now,
    )

    fun issue(title: String, description: String? = null, notes: String? = null, date: String = "2026-01-10") = IssueEntry(
        UUID.randomUUID(), recruitId, LocalDate.parse(date), title, description,
        IssueSeverity.HIGH, IssueStatus.OPEN, notes, 1, now, now,
    )

    fun feedback(subject: String, details: String = "details", date: String = "2026-01-15") = FeedbackNote(
        UUID.randomUUID(), recruitId, LocalDate.parse(date), subject, FeedbackType.POSITIVE, details, 1, now, now,
    )

    fun document(
        type: ReportType,
        tasks: List<TaskEntry>? = if (type.includesTasks) emptyList() else null,
        issues: List<IssueEntry>? = if (type.includesIssues) emptyList() else null,
        feedback: List<FeedbackNote>? = if (type.includesFeedback) emptyList() else null,
        feedbackOmitted: Boolean = false,
    ) = ReportDocument(recruit, range, type, now, tasks, issues, feedback, feedbackOmitted)
}
