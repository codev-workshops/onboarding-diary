package com.onboardingdiary.api.dashboard

import com.fasterxml.jackson.annotation.JsonInclude
import com.onboardingdiary.api.issue.IssueResponse
import com.onboardingdiary.dashboard.DashboardAggregates
import com.onboardingdiary.dashboard.RecentEntry
import com.onboardingdiary.feedback.FeedbackType
import com.onboardingdiary.issue.IssueSeverity
import com.onboardingdiary.issue.IssueStatus
import com.onboardingdiary.task.TaskStatus
import java.util.UUID

/** openapi `DashboardSummary`. Every enum key is present in the count maps (0 when absent). */
data class DashboardSummaryResponse(
    val recruitId: UUID,
    val tasks: TaskSummary,
    val issues: IssueSummary,
    /** Omitted from the JSON when the caller fails `FeedbackVisibility.canRead` (D3). */
    @field:JsonInclude(JsonInclude.Include.NON_NULL) val feedback: FeedbackSummary?,
    val notes: NoteSummary,
    val recentEntries: List<RecentEntry>,
) {
    companion object {
        fun from(recruitId: UUID, a: DashboardAggregates) = DashboardSummaryResponse(
            recruitId = recruitId,
            tasks = TaskSummary.from(a.tasksByStatus),
            issues = IssueSummary(
                total = a.issuesByStatus.values.sum(),
                open = OPEN_STATUSES.sumOf { a.issuesByStatus[it] ?: 0L },
                byStatus = complete(a.issuesByStatus, IssueStatus.entries),
                bySeverity = complete(a.issuesBySeverity, IssueSeverity.entries),
                recentOpen = a.recentOpenIssues.map(IssueResponse::from),
            ),
            feedback = a.feedbackByType?.let { FeedbackSummary(it.values.sum(), complete(it, FeedbackType.entries)) },
            notes = NoteSummary(a.noteCount),
            recentEntries = a.recentEntries,
        )

        private val OPEN_STATUSES = listOf(IssueStatus.OPEN, IssueStatus.IN_PROGRESS)

        private fun <K : Enum<K>> complete(counts: Map<K, Long>, keys: List<K>): Map<K, Long> =
            keys.associateWith { counts[it] ?: 0L }
    }
}

data class TaskSummary(val total: Long, val byStatus: Map<TaskStatus, Long>, val completionPercent: Int) {
    companion object {
        fun from(byStatus: Map<TaskStatus, Long>): TaskSummary {
            val total = byStatus.values.sum()
            return TaskSummary(
                total = total,
                byStatus = TaskStatus.entries.associateWith { byStatus[it] ?: 0L },
                completionPercent = completionPercent(byStatus[TaskStatus.DONE] ?: 0L, total),
            )
        }

        /** `DONE / total` as a whole percentage, rounded half up; 0 when there are no tasks (REQ-FUNC-071). */
        fun completionPercent(done: Long, total: Long): Int =
            if (total == 0L) 0 else ((done * 200 + total) / (total * 2)).toInt()
    }
}

data class IssueSummary(
    val total: Long,
    val open: Long,
    val byStatus: Map<IssueStatus, Long>,
    val bySeverity: Map<IssueSeverity, Long>,
    val recentOpen: List<IssueResponse>,
)

data class FeedbackSummary(val total: Long, val byType: Map<FeedbackType, Long>)

data class NoteSummary(val total: Long)
