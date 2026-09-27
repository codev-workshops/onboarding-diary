package com.onboardingdiary.note

import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.Sort
import com.onboardingdiary.api.paging.SortDirection
import com.onboardingdiary.api.paging.SortWhitelist
import com.onboardingdiary.entry.DateRangeFilter
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import org.springframework.transaction.support.TransactionTemplate
import java.sql.ResultSet
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.UUID

/** Optional list filters (REQ-FUNC-061); every field is combinable. `tag` is already normalized. */
data class NoteFilter(
    val range: DateRangeFilter = DateRangeFilter.NONE,
    val tag: String? = null,
)

/**
 * Blocking JDBC access to `additional_notes` + `note_tags`; callers offload via
 * `withContext(Dispatchers.IO)`. Note row and tag rows are written in one
 * transaction so a note never exists with a partial tag set.
 */
@Repository
class NoteRepository(private val jdbc: JdbcTemplate, private val tx: TransactionTemplate) {

    fun findById(id: UUID): AdditionalNote? =
        jdbc.query("$SELECT WHERE n.id = ?", MAPPER, id).firstOrNull()

    fun search(recruitId: UUID, filter: NoteFilter, page: PageRequest): Page<AdditionalNote> {
        val where = mutableListOf("n.recruit_id = ?")
        val args = mutableListOf<Any>(recruitId)
        filter.range.from?.let { where += "n.entry_date >= ?"; args += it }
        filter.range.to?.let { where += "n.entry_date <= ?"; args += it }
        filter.tag?.let { where += "EXISTS (SELECT 1 FROM note_tags t WHERE t.note_id = n.id AND t.tag = ?)"; args += it }
        val clause = " WHERE " + where.joinToString(" AND ")
        val total = jdbc.queryForObject("SELECT count(*) FROM additional_notes n$clause", Long::class.java, *args.toTypedArray()) ?: 0L
        val items = jdbc.query(
            "$SELECT$clause ORDER BY ${page.orderBy}, n.created_at DESC, n.id ASC LIMIT ? OFFSET ?",
            MAPPER, *args.toTypedArray(), page.size, page.offset,
        )
        return Page(items, page.page, page.size, total)
    }

    fun insert(recruitId: UUID, entryDate: LocalDate, title: String, content: String, tags: List<String>): AdditionalNote =
        tx.execute {
            val id = jdbc.queryForObject(
                """
                INSERT INTO additional_notes (recruit_id, entry_date, title, content)
                VALUES (?, ?, ?, ?)
                RETURNING id
                """.trimIndent(),
                UUID::class.java,
                recruitId, entryDate, title, content,
            )!!
            insertTags(id, tags)
            findById(id)!!
        }!!

    /** CAS update replacing the whole tag set; `null` when [expectedVersion] no longer matches. */
    fun update(id: UUID, entryDate: LocalDate, title: String, content: String, tags: List<String>, expectedVersion: Long): AdditionalNote? =
        tx.execute {
            val rows = jdbc.update(
                """
                UPDATE additional_notes
                   SET entry_date = ?, title = ?, content = ?, version = version + 1, updated_at = now()
                 WHERE id = ? AND version = ?
                """.trimIndent(),
                entryDate, title, content, id, expectedVersion,
            )
            if (rows != 1) return@execute null
            jdbc.update("DELETE FROM note_tags WHERE note_id = ?", id)
            insertTags(id, tags)
            findById(id)
        }

    fun delete(id: UUID): Boolean = jdbc.update("DELETE FROM additional_notes WHERE id = ?", id) == 1

    private fun insertTags(noteId: UUID, tags: List<String>) {
        if (tags.isEmpty()) return
        jdbc.batchUpdate(
            "INSERT INTO note_tags (note_id, tag) VALUES (?, ?)",
            tags.map { arrayOf<Any>(noteId, it) },
        )
    }

    companion object {
        val NOTE_SORT = SortWhitelist(
            mapOf(
                "entryDate" to "n.entry_date",
                "createdAt" to "n.created_at",
                "title" to "n.title",
            ),
            Sort("entryDate", SortDirection.DESC),
        )

        private const val SELECT = """
            SELECT n.id, n.recruit_id, n.entry_date, n.title, n.content, n.version, n.created_at, n.updated_at,
                   COALESCE((SELECT array_agg(t.tag ORDER BY t.tag) FROM note_tags t WHERE t.note_id = n.id), '{}') AS tags
              FROM additional_notes n
        """

        private val MAPPER = RowMapper<AdditionalNote> { rs: ResultSet, _ ->
            @Suppress("UNCHECKED_CAST")
            val tags = (rs.getArray("tags").array as Array<String>).toList()
            AdditionalNote(
                id = rs.getObject("id", UUID::class.java),
                recruitId = rs.getObject("recruit_id", UUID::class.java),
                entryDate = rs.getObject("entry_date", LocalDate::class.java),
                title = rs.getString("title"),
                content = rs.getString("content"),
                tags = tags,
                version = rs.getLong("version"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                updatedAt = rs.getObject("updated_at", OffsetDateTime::class.java).toInstant(),
            )
        }
    }
}
