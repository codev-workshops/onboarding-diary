package com.onboardingdiary.dashboard

import com.onboardingdiary.feedback.FeedbackType
import com.onboardingdiary.issue.IssueEntry
import com.onboardingdiary.issue.IssueSeverity
import com.onboardingdiary.issue.IssueStatus
import com.onboardingdiary.task.TaskStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.support.TransactionTemplate
import java.sql.ResultSet
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

enum class RecentEntryKind { TASK, ISSUE, FEEDBACK, NOTE }

data class RecentEntry(val kind: RecentEntryKind, val id: UUID, val entryDate: LocalDate, val title: String, val createdAt: Instant)

/** Raw aggregates for one recruit; `feedbackByType` is `null` when feedback was not requested. */
data class DashboardAggregates(
    val tasksByStatus: Map<TaskStatus, Long>,
    val issuesByStatus: Map<IssueStatus, Long>,
    val issuesBySeverity: Map<IssueSeverity, Long>,
    val recentOpenIssues: List<IssueEntry>,
    val feedbackByType: Map<FeedbackType, Long>?,
    val noteCount: Long,
    val recentEntries: List<RecentEntry>,
)

/**
 * Read model over the S3–S6 entry tables (REQ-FUNC-070..073). All queries run
 * in one read-only REPEATABLE READ transaction so counts and lists come from
 * the same snapshot. Blocking JDBC; callers offload via `withContext(Dispatchers.IO)`.
 */
@Repository
class DashboardRepository(private val jdbc: JdbcTemplate, tx: TransactionTemplate) {

    private val snapshot = TransactionTemplate(tx.transactionManager!!).apply {
        isReadOnly = true
        isolationLevel = TransactionDefinition.ISOLATION_REPEATABLE_READ
    }

    fun aggregate(recruitId: UUID, includeFeedback: Boolean): DashboardAggregates = snapshot.execute {
        val tasks = countBy("SELECT status AS k, count(*) AS n FROM task_entries WHERE recruit_id = ? GROUP BY status", recruitId, TaskStatus::valueOf)

        val issueStatus = mutableMapOf<IssueStatus, Long>()
        val issueSeverity = mutableMapOf<IssueSeverity, Long>()
        jdbc.query(
            "SELECT status, severity, count(*) AS n FROM issue_entries WHERE recruit_id = ? GROUP BY status, severity",
            { rs: ResultSet ->
                val n = rs.getLong("n")
                issueStatus.merge(IssueStatus.valueOf(rs.getString("status")), n, Long::plus)
                issueSeverity.merge(IssueSeverity.valueOf(rs.getString("severity")), n, Long::plus)
            },
            recruitId,
        )

        val recentOpen = jdbc.query(
            """
            SELECT id, recruit_id, entry_date, title, description, severity, status, resolution_notes, version, created_at, updated_at
              FROM issue_entries
             WHERE recruit_id = ? AND status IN ('OPEN', 'IN_PROGRESS')
             ORDER BY created_at DESC, id ASC
             LIMIT ?
            """.trimIndent(),
            ISSUE_MAPPER, recruitId, RECENT_OPEN_ISSUES,
        )

        val feedback = if (includeFeedback) {
            countBy("SELECT type AS k, count(*) AS n FROM feedback_notes WHERE recruit_id = ? GROUP BY type", recruitId, FeedbackType::valueOf)
        } else {
            null
        }

        val notes = jdbc.queryForObject("SELECT count(*) FROM additional_notes WHERE recruit_id = ?", Long::class.java, recruitId) ?: 0L

        val branches = buildList {
            add("SELECT 'TASK' AS kind, id, entry_date, title, created_at FROM task_entries WHERE recruit_id = ?")
            add("SELECT 'ISSUE', id, entry_date, title, created_at FROM issue_entries WHERE recruit_id = ?")
            if (includeFeedback) add("SELECT 'FEEDBACK', id, entry_date, subject, created_at FROM feedback_notes WHERE recruit_id = ?")
            add("SELECT 'NOTE', id, entry_date, title, created_at FROM additional_notes WHERE recruit_id = ?")
        }
        val recent = jdbc.query(
            branches.joinToString("\nUNION ALL\n", postfix = "\nORDER BY created_at DESC, id ASC LIMIT ?"),
            RECENT_MAPPER, *Array<Any>(branches.size) { recruitId }, RECENT_ENTRIES,
        )

        DashboardAggregates(tasks, issueStatus, issueSeverity, recentOpen, feedback, notes, recent)
    }!!

    private fun <K> countBy(sql: String, recruitId: UUID, key: (String) -> K): Map<K, Long> =
        jdbc.query(sql, { rs: ResultSet, _ -> key(rs.getString("k")) to rs.getLong("n") }, recruitId).toMap()

    companion object {
        const val RECENT_OPEN_ISSUES = 5
        const val RECENT_ENTRIES = 10

        private val RECENT_MAPPER = RowMapper<RecentEntry> { rs: ResultSet, _ ->
            RecentEntry(
                kind = RecentEntryKind.valueOf(rs.getString("kind")),
                id = rs.getObject("id", UUID::class.java),
                entryDate = rs.getObject("entry_date", LocalDate::class.java),
                title = rs.getString("title"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
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
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                updatedAt = rs.getObject("updated_at", OffsetDateTime::class.java).toInstant(),
            )
        }
    }
}
