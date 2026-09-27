package com.onboardingdiary.assignment

import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.Sort
import com.onboardingdiary.api.paging.SortDirection
import com.onboardingdiary.api.paging.SortWhitelist
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserRepository
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.time.OffsetDateTime
import java.util.UUID

/** A recruit currently assigned to a manager, as listed by `GET /me/recruits`. */
data class ActiveRecruit(val recruit: User, val assignedAt: Instant)

/**
 * Blocking JDBC access to `assignments`. Callers offload via
 * `withContext(Dispatchers.IO)`; the reassignment transaction in
 * [AssignmentService] runs several of these calls on one connection.
 */
@Repository
class AssignmentRepository(private val jdbc: JdbcTemplate) {

    fun findById(id: UUID): Assignment? =
        jdbc.query("$SELECT WHERE id = ?", MAPPER, id).firstOrNull()

    fun findActiveByRecruit(recruitId: UUID): Assignment? =
        jdbc.query("$SELECT WHERE recruit_id = ? AND status = 'ACTIVE'", MAPPER, recruitId).firstOrNull()

    /** Fresh query on every call — intentionally no caching (REQ-FUNC-022). */
    fun existsActive(managerId: UUID, recruitId: UUID): Boolean =
        jdbc.queryForObject(
            "SELECT count(*) FROM assignments WHERE manager_id = ? AND recruit_id = ? AND status = 'ACTIVE'",
            Long::class.java, managerId, recruitId,
        )!! > 0

    fun countActiveByManager(managerId: UUID): Long =
        jdbc.queryForObject(
            "SELECT count(*) FROM assignments WHERE manager_id = ? AND status = 'ACTIVE'",
            Long::class.java, managerId,
        ) ?: 0L

    fun hasActiveAsParty(userId: UUID): Boolean =
        jdbc.queryForObject(
            "SELECT count(*) FROM assignments WHERE (recruit_id = ? OR manager_id = ?) AND status = 'ACTIVE'",
            Long::class.java, userId, userId,
        )!! > 0

    fun insertActive(recruitId: UUID, managerId: UUID, assignedById: UUID, note: String?): Assignment {
        val id = jdbc.queryForObject(
            """
            INSERT INTO assignments (recruit_id, manager_id, assigned_by_id, status, note)
            VALUES (?, ?, ?, 'ACTIVE', ?)
            RETURNING id
            """.trimIndent(),
            UUID::class.java, recruitId, managerId, assignedById, note,
        )!!
        return findById(id)!!
    }

    /** Marks an ACTIVE assignment REASSIGNED; returns null if it was no longer ACTIVE. */
    fun end(id: UUID): Assignment? {
        val rows = jdbc.update(
            """
            UPDATE assignments
               SET status = 'REASSIGNED', ended_at = now(), updated_at = now()
             WHERE id = ? AND status = 'ACTIVE'
            """.trimIndent(),
            id,
        )
        return if (rows == 1) findById(id) else null
    }

    /** Ends every ACTIVE assignment the user takes part in (as recruit or manager); returns the number ended. */
    fun endAllActiveForParty(userId: UUID): Int =
        jdbc.update(
            """
            UPDATE assignments
               SET status = 'ENDED', ended_at = now(), updated_at = now()
             WHERE (recruit_id = ? OR manager_id = ?) AND status = 'ACTIVE'
            """.trimIndent(),
            userId, userId,
        )

    fun search(recruitId: UUID?, managerId: UUID?, status: AssignmentStatus?, page: PageRequest): Page<Assignment> {
        val where = mutableListOf<String>()
        val args = mutableListOf<Any>()
        if (recruitId != null) { where += "recruit_id = ?"; args += recruitId }
        if (managerId != null) { where += "manager_id = ?"; args += managerId }
        if (status != null) { where += "status = ?"; args += status.name }
        val clause = if (where.isEmpty()) "" else " WHERE " + where.joinToString(" AND ")
        val total = jdbc.queryForObject("SELECT count(*) FROM assignments$clause", Long::class.java, *args.toTypedArray()) ?: 0L
        val items = jdbc.query(
            "$SELECT$clause ORDER BY ${page.orderBy}, id ASC LIMIT ? OFFSET ?",
            MAPPER, *args.toTypedArray(), page.size, page.offset,
        )
        return Page(items, page.page, page.size, total)
    }

    fun activeRecruitsForManager(managerId: UUID, page: PageRequest): Page<ActiveRecruit> {
        val total = countActiveByManager(managerId)
        val items = jdbc.query(
            """
            SELECT ${UserRepository.COLUMNS.prependEach("u.")}, a.assigned_at AS a_assigned_at
              FROM assignments a JOIN users u ON u.id = a.recruit_id
             WHERE a.manager_id = ? AND a.status = 'ACTIVE'
             ORDER BY ${page.orderBy}, u.id ASC
             LIMIT ? OFFSET ?
            """.trimIndent(),
            { rs, i -> ActiveRecruit(UserRepository.MAPPER.mapRow(rs, i)!!, rs.getObject("a_assigned_at", OffsetDateTime::class.java).toInstant()) },
            managerId, page.size, page.offset,
        )
        return Page(items, page.page, page.size, total)
    }

    companion object {
        val ASSIGNMENT_SORT = SortWhitelist(
            mapOf("assignedAt" to "assigned_at", "endedAt" to "ended_at", "status" to "status"),
            Sort("assignedAt", SortDirection.DESC),
        )
        val HISTORY_SORT = SortWhitelist(mapOf("assignedAt" to "assigned_at"), Sort("assignedAt", SortDirection.DESC))
        val MY_RECRUITS_SORT = SortWhitelist(
            mapOf("fullName" to "u.full_name", "email" to "u.email", "assignedAt" to "a.assigned_at"),
            Sort("fullName", SortDirection.ASC),
        )

        private const val SELECT = """
            SELECT id, recruit_id, manager_id, assigned_by_id, status, assigned_at, ended_at, note, created_at, updated_at
              FROM assignments
        """

        private val MAPPER = RowMapper<Assignment> { rs: ResultSet, _ ->
            Assignment(
                id = rs.getObject("id", UUID::class.java),
                recruitId = rs.getObject("recruit_id", UUID::class.java),
                managerId = rs.getObject("manager_id", UUID::class.java),
                assignedById = rs.getObject("assigned_by_id", UUID::class.java),
                status = AssignmentStatus.valueOf(rs.getString("status")),
                assignedAt = rs.getObject("assigned_at", OffsetDateTime::class.java).toInstant(),
                endedAt = rs.getObject("ended_at", OffsetDateTime::class.java)?.toInstant(),
                note = rs.getString("note"),
                createdAt = rs.getObject("created_at", OffsetDateTime::class.java).toInstant(),
                updatedAt = rs.getObject("updated_at", OffsetDateTime::class.java).toInstant(),
            )
        }

        private fun List<String>.prependEach(prefix: String) = joinToString(", ") { "$prefix$it" }
    }
}
