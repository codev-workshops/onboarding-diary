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
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.support.TransactionTemplate
import java.sql.ResultSet
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

/** Sections of one report; `null` = not requested. */
data class ReportSections(val tasks: List<TaskEntry>?, val issues: List<IssueEntry>?, val feedback: List<FeedbackNote>?)

/**
 * Read model for reports (REQ-FUNC-080): every included section is loaded in
 * one read-only REPEATABLE READ transaction so a COMBINED report is a single
 * snapshot. Rows are ordered `entry_date ASC, created_at ASC` for a
 * chronological document. Blocking JDBC; callers offload via `withContext(Dispatchers.IO)`.
 */
@Repository
class ReportRepository(private val jdbc: JdbcTemplate, tx: TransactionTemplate) {

    private val snapshot = TransactionTemplate(tx.transactionManager!!).apply {
        isReadOnly = true
        isolationLevel = TransactionDefinition.ISOLATION_REPEATABLE_READ
    }

    fun load(recruitId: UUID, range: ReportRange, tasks: Boolean, issues: Boolean, feedback: Boolean): ReportSections = snapshot.execute {
        ReportSections(
            tasks = if (tasks) jdbc.query(TASKS_SQL, TASK_MAPPER, recruitId, range.from, range.to) else null,
            issues = if (issues) jdbc.query(ISSUES_SQL, ISSUE_MAPPER, recruitId, range.from, range.to) else null,
            feedback = if (feedback) jdbc.query(FEEDBACK_SQL, FEEDBACK_MAPPER, recruitId, range.from, range.to) else null,
        )
    }!!

    companion object {
        private const val WHERE = "WHERE recruit_id = ? AND entry_date >= ? AND entry_date <= ? ORDER BY entry_date ASC, created_at ASC, id ASC"

        private const val TASKS_SQL =
            "SELECT id, recruit_id, entry_date, title, description, category, status, priority, version, created_at, updated_at FROM task_entries $WHERE"
        private const val ISSUES_SQL =
            "SELECT id, recruit_id, entry_date, title, description, severity, status, resolution_notes, version, created_at, updated_at FROM issue_entries $WHERE"
        private const val FEEDBACK_SQL =
            "SELECT id, recruit_id, entry_date, subject, type, details, version, created_at, updated_at FROM feedback_notes $WHERE"

        private fun ResultSet.instant(column: String) = getObject(column, OffsetDateTime::class.java).toInstant()

        private val TASK_MAPPER = RowMapper<TaskEntry> { rs: ResultSet, _ ->
            TaskEntry(
                id = rs.getObject("id", UUID::class.java),
                recruitId = rs.getObject("recruit_id", UUID::class.java),
                entryDate = rs.getObject("entry_date", LocalDate::class.java),
                title = rs.getString("title"),
                description = rs.getString("description"),
                category = TaskCategory.valueOf(rs.getString("category")),
                status = TaskStatus.valueOf(rs.getString("status")),
                priority = TaskPriority.valueOf(rs.getString("priority")),
                version = rs.getLong("version"),
                createdAt = rs.instant("created_at"),
                updatedAt = rs.instant("updated_at"),
            )
        }

        private val ISSUE_MAPPER = RowMapper<IssueEntry> { rs: ResultSet, _ ->
            IssueEntry(
                id = rs.getObject("id", UUID::class.java),
                recruitId = rs.getObject("recruit_id", UUID::class.java),
                entryDate = rs.getObject("entry_date", LocalDate::class.java),
                title = rs.getString("title"),
                description = rs.getString("description"),
                severity = IssueSeverity.valueOf(rs.getString("severity")),
                status = IssueStatus.valueOf(rs.getString("status")),
                resolutionNotes = rs.getString("resolution_notes"),
                version = rs.getLong("version"),
                createdAt = rs.instant("created_at"),
                updatedAt = rs.instant("updated_at"),
            )
        }

        private val FEEDBACK_MAPPER = RowMapper<FeedbackNote> { rs: ResultSet, _ ->
            FeedbackNote(
                id = rs.getObject("id", UUID::class.java),
                recruitId = rs.getObject("recruit_id", UUID::class.java),
                entryDate = rs.getObject("entry_date", LocalDate::class.java),
                subject = rs.getString("subject"),
                type = FeedbackType.valueOf(rs.getString("type")),
                details = rs.getString("details"),
                version = rs.getLong("version"),
                createdAt = rs.instant("created_at"),
                updatedAt = rs.instant("updated_at"),
            )
        }
    }
}
