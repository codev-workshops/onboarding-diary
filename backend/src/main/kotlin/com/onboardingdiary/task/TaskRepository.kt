package com.onboardingdiary.task

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

/** Optional list filters (REQ-FUNC-032); every field is combinable. */
data class TaskFilter(
    val range: DateRangeFilter = DateRangeFilter.NONE,
    val category: TaskCategory? = null,
    val status: TaskStatus? = null,
)

/** Blocking JDBC access to `task_entries`; callers offload via `withContext(Dispatchers.IO)`. */
@Repository
class TaskRepository(private val jdbc: JdbcTemplate) {

    fun findById(id: UUID): TaskEntry? =
        jdbc.query("$SELECT WHERE id = ?", MAPPER, id).firstOrNull()

    fun search(recruitId: UUID, filter: TaskFilter, page: PageRequest): Page<TaskEntry> {
        val where = mutableListOf("recruit_id = ?")
        val args = mutableListOf<Any>(recruitId)
        filter.range.from?.let { where += "entry_date >= ?"; args += it }
        filter.range.to?.let { where += "entry_date <= ?"; args += it }
        filter.category?.let { where += "category = ?"; args += it.name }
        filter.status?.let { where += "status = ?"; args += it.name }
        val clause = " WHERE " + where.joinToString(" AND ")
        val total = jdbc.queryForObject("SELECT count(*) FROM task_entries$clause", Long::class.java, *args.toTypedArray()) ?: 0L
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
        category: TaskCategory,
        status: TaskStatus,
        priority: TaskPriority,
    ): TaskEntry {
        val id = jdbc.queryForObject(
            """
            INSERT INTO task_entries (recruit_id, entry_date, title, description, category, status, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """.trimIndent(),
            UUID::class.java,
            recruitId, entryDate, title, description, category.name, status.name, priority.name,
        )!!
        return findById(id)!!
    }

    fun update(
        id: UUID,
        entryDate: LocalDate,
        title: String,
        description: String?,
        category: TaskCategory,
        status: TaskStatus,
        priority: TaskPriority,
        expectedVersion: Long,
    ): Boolean {
        val rows = jdbc.update(
            """
            UPDATE task_entries
               SET entry_date = ?, title = ?, description = ?, category = ?, status = ?, priority = ?,
                   version = version + 1, updated_at = now()
             WHERE id = ? AND version = ?
            """.trimIndent(),
            entryDate, title, description, category.name, status.name, priority.name, id, expectedVersion,
        )
        return rows == 1
    }

    fun delete(id: UUID): Boolean = jdbc.update("DELETE FROM task_entries WHERE id = ?", id) == 1

    companion object {
        val TASK_SORT = SortWhitelist(
            mapOf(
                "entryDate" to "entry_date",
                "createdAt" to "created_at",
                "title" to "title",
                "status" to "status",
                "priority" to "priority",
                "category" to "category",
            ),
            Sort("entryDate", SortDirection.DESC),
        )

        private const val SELECT = """
            SELECT id, recruit_id, entry_date, title, description, category, status, priority, version, created_at, updated_at
              FROM task_entries
        """

        private val MAPPER = RowMapper<TaskEntry> { rs: ResultSet, _ ->
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
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                updatedAt = rs.getObject("updated_at", OffsetDateTime::class.java).toInstant(),
            )
        }
    }
}
