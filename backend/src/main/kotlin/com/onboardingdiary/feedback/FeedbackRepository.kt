package com.onboardingdiary.feedback

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

/** Optional list filters (REQ-FUNC-051); every field is combinable. */
data class FeedbackFilter(
    val range: DateRangeFilter = DateRangeFilter.NONE,
    val type: FeedbackType? = null,
)

/** Blocking JDBC access to `feedback_notes`; callers offload via `withContext(Dispatchers.IO)`. */
@Repository
class FeedbackRepository(private val jdbc: JdbcTemplate) {

    fun findById(id: UUID): FeedbackNote? =
        jdbc.query("$SELECT WHERE id = ?", MAPPER, id).firstOrNull()

    fun search(recruitId: UUID, filter: FeedbackFilter, page: PageRequest): Page<FeedbackNote> {
        val where = mutableListOf("recruit_id = ?")
        val args = mutableListOf<Any>(recruitId)
        filter.range.from?.let { where += "entry_date >= ?"; args += it }
        filter.range.to?.let { where += "entry_date <= ?"; args += it }
        filter.type?.let { where += "type = ?"; args += it.name }
        val clause = " WHERE " + where.joinToString(" AND ")
        val total = jdbc.queryForObject("SELECT count(*) FROM feedback_notes$clause", Long::class.java, *args.toTypedArray()) ?: 0L
        val items = jdbc.query(
            "$SELECT$clause ORDER BY ${page.orderBy}, created_at DESC, id ASC LIMIT ? OFFSET ?",
            MAPPER, *args.toTypedArray(), page.size, page.offset,
        )
        return Page(items, page.page, page.size, total)
    }

    fun insert(recruitId: UUID, entryDate: LocalDate, subject: String, type: FeedbackType, details: String): FeedbackNote {
        val id = jdbc.queryForObject(
            """
            INSERT INTO feedback_notes (recruit_id, entry_date, subject, type, details)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id
            """.trimIndent(),
            UUID::class.java,
            recruitId, entryDate, subject, type.name, details,
        )!!
        return findById(id)!!
    }

    /** CAS update; returns the row as written, or `null` when [expectedVersion] no longer matches. */
    fun update(id: UUID, entryDate: LocalDate, subject: String, type: FeedbackType, details: String, expectedVersion: Long): FeedbackNote? =
        jdbc.query(
            """
            UPDATE feedback_notes
               SET entry_date = ?, subject = ?, type = ?, details = ?,
                   version = version + 1, updated_at = now()
             WHERE id = ? AND version = ?
            RETURNING id, recruit_id, entry_date, subject, type, details, version, created_at, updated_at
            """.trimIndent(),
            MAPPER, entryDate, subject, type.name, details, id, expectedVersion,
        ).firstOrNull()

    fun delete(id: UUID): Boolean = jdbc.update("DELETE FROM feedback_notes WHERE id = ?", id) == 1

    companion object {
        val FEEDBACK_SORT = SortWhitelist(
            mapOf(
                "entryDate" to "entry_date",
                "createdAt" to "created_at",
                "subject" to "subject",
                "type" to "type",
            ),
            Sort("entryDate", SortDirection.DESC),
        )

        private const val SELECT = """
            SELECT id, recruit_id, entry_date, subject, type, details, version, created_at, updated_at
              FROM feedback_notes
        """

        private val MAPPER = RowMapper<FeedbackNote> { rs: ResultSet, _ ->
            FeedbackNote(
                id = rs.getObject("id", UUID::class.java),
                recruitId = rs.getObject("recruit_id", UUID::class.java),
                entryDate = rs.getObject("entry_date", LocalDate::class.java),
                subject = rs.getString("subject"),
                type = FeedbackType.valueOf(rs.getString("type")),
                details = rs.getString("details"),
                version = rs.getLong("version"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                updatedAt = rs.getObject("updated_at", OffsetDateTime::class.java).toInstant(),
            )
        }
    }
}
