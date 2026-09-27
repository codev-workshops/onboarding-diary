package com.onboardingdiary.issue

import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.Sort
import com.onboardingdiary.api.paging.SortDirection
import com.onboardingdiary.api.paging.SortWhitelist
import com.onboardingdiary.entry.DateRangeFilter
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

/** Optional list filters (REQ-FUNC-042); every field is combinable. */
data class IssueFilter(
    val range: DateRangeFilter = DateRangeFilter.NONE,
    val status: IssueStatus? = null,
    val severity: IssueSeverity? = null,
)

/** Blocking JDBC access to `issue_entries`; callers offload via `withContext(Dispatchers.IO)`. */
@Repository
class IssueRepository(private val jdbc: JdbcTemplate) {

    fun findById(id: UUID): IssueEntry? =
        jdbc.query("$SELECT WHERE id = ?", MAPPER, id).firstOrNull()

    fun search(recruitId: UUID, filter: IssueFilter, page: PageRequest): Page<IssueEntry> {
        val where = mutableListOf("recruit_id = ?")
        val args = mutableListOf<Any>(recruitId)
        filter.range.from?.let { where += "entry_date >= ?"; args += it }
        filter.range.to?.let { where += "entry_date <= ?"; args += it }
        filter.status?.let { where += "status = ?"; args += it.name }
        filter.severity?.let { where += "severity = ?"; args += it.name }
        val clause = " WHERE " + where.joinToString(" AND ")
        val total = jdbc.queryForObject("SELECT count(*) FROM issue_entries$clause", Long::class.java, *args.toTypedArray()) ?: 0L
        val items = jdbc.query(
            "$SELECT$clause ORDER BY ${page.orderBy}, created_at DESC, id ASC LIMIT ? OFFSET ?",
            MAPPER, *args.toTypedArray(), page.size, page.offset,
        )
        return Page(items, page.page, page.size, total)
    }

    fun insert(
        recruitId: UUID,
        entryDate: LocalDate,
        title: String,
        description: String?,
        severity: IssueSeverity,
        status: IssueStatus,
        resolutionNotes: String?,
    ): IssueEntry {
        val id = jdbc.queryForObject(
            """
            INSERT INTO issue_entries (recruit_id, entry_date, title, description, severity, status, resolution_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """.trimIndent(),
            UUID::class.java,
            recruitId, entryDate, title, description, severity.name, status.name, resolutionNotes,
        )!!
        return findById(id)!!
    }

    fun update(
        id: UUID,
        entryDate: LocalDate,
        title: String,
        description: String?,
        severity: IssueSeverity,
        status: IssueStatus,
        resolutionNotes: String?,
        expectedVersion: Long,
    ): Boolean {
        val rows = jdbc.update(
            """
            UPDATE issue_entries
               SET entry_date = ?, title = ?, description = ?, severity = ?, status = ?, resolution_notes = ?,
                   version = version + 1, updated_at = now()
             WHERE id = ? AND version = ?
            """.trimIndent(),
            entryDate, title, description, severity.name, status.name, resolutionNotes, id, expectedVersion,
        )
        return rows == 1
    }

    fun delete(id: UUID): Boolean = jdbc.update("DELETE FROM issue_entries WHERE id = ?", id) == 1

    companion object {
        /** Ranks severity so `severity,desc` yields CRITICAL first (plain text order would put MEDIUM before HIGH). */
        private const val SEVERITY_RANK =
            "CASE severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END"

        val ISSUE_SORT = SortWhitelist(
            mapOf(
                "entryDate" to "entry_date",
                "createdAt" to "created_at",
                "title" to "title",
                "status" to "status",
                "severity" to SEVERITY_RANK,
            ),
            Sort("entryDate", SortDirection.DESC),
        )

        private const val SELECT = """
            SELECT id, recruit_id, entry_date, title, description, severity, status, resolution_notes, version, created_at, updated_at
              FROM issue_entries
        """

        private val MAPPER = RowMapper<IssueEntry> { rs: ResultSet, _ ->
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
