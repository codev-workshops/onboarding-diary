package com.onboardingdiary.user

import com.onboardingdiary.api.paging.Page
import com.onboardingdiary.api.paging.PageRequest
import com.onboardingdiary.api.paging.Sort
import com.onboardingdiary.api.paging.SortDirection
import com.onboardingdiary.api.paging.SortWhitelist
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

/**
 * Blocking JDBC access to `users`. Callers offload via
 * `withContext(Dispatchers.IO)` (see backend/AGENTS.md).
 */
@Repository
class UserRepository(private val jdbc: JdbcTemplate) {

    fun findById(id: UUID): User? =
        jdbc.query("$SELECT WHERE id = ?", MAPPER, id).firstOrNull()

    fun findByEmail(normalizedEmail: String): User? =
        jdbc.query("$SELECT WHERE email = ?", MAPPER, normalizedEmail).firstOrNull()

    fun findByIds(ids: Collection<UUID>): Map<UUID, User> {
        if (ids.isEmpty()) return emptyMap()
        val distinct = ids.toSet()
        val placeholders = distinct.joinToString(",") { "?" }
        return jdbc.query("$SELECT WHERE id IN ($placeholders)", MAPPER, *distinct.toTypedArray()).associateBy { it.id }
    }

    fun countByRole(role: Role): Long =
        jdbc.queryForObject("SELECT count(*) FROM users WHERE role = ?", Long::class.java, role.name) ?: 0L

    /** Admin listing (REQ-FUNC-011): optional role/status filters and a case-insensitive `q` on email / full name. */
    fun search(role: Role?, status: UserStatus?, q: String?, page: PageRequest): Page<User> {
        val where = mutableListOf<String>()
        val args = mutableListOf<Any>()
        if (role != null) { where += "role = ?"; args += role.name }
        if (status != null) { where += "status = ?"; args += status.name }
        val term = q?.trim()?.takeIf { it.isNotEmpty() }
        if (term != null) {
            where += "(email ILIKE ? OR full_name ILIKE ?)"
            val like = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            args += like; args += like
        }
        val clause = if (where.isEmpty()) "" else " WHERE " + where.joinToString(" AND ")
        val total = jdbc.queryForObject("SELECT count(*) FROM users$clause", Long::class.java, *args.toTypedArray()) ?: 0L
        val items = jdbc.query(
            "$SELECT$clause ORDER BY ${page.orderBy}, id ASC LIMIT ? OFFSET ?",
            MAPPER, *args.toTypedArray(), page.size, page.offset,
        )
        return Page(items, page.page, page.size, total)
    }

    fun insert(
        email: String,
        passwordHash: String?,
        role: Role,
        status: UserStatus,
        fullName: String,
        department: String?,
        startDate: LocalDate?,
        createdById: UUID?,
        activatedAt: Instant?,
    ): User {
        val id = jdbc.queryForObject(
            """
            INSERT INTO users (email, password_hash, role, status, full_name, department, start_date, created_by_id, activated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
            """.trimIndent(),
            UUID::class.java,
            email, passwordHash, role.name, status.name, fullName, department, startDate, createdById,
            activatedAt?.atOffset(ZoneOffset.UTC),
        )!!
        return findById(id)!!
    }

    fun activate(id: UUID, passwordHash: String, fullName: String?): User? {
        val rows = jdbc.update(
            """
            UPDATE users
               SET password_hash = ?,
                   status = 'ACTIVE',
                   activated_at = now(),
                   full_name = COALESCE(?, full_name),
                   updated_at = now()
             WHERE id = ? AND status = 'INVITED'
            """.trimIndent(),
            passwordHash, fullName, id,
        )
        return if (rows == 1) findById(id) else null
    }

    fun updateFullName(id: UUID, fullName: String): User {
        jdbc.update("UPDATE users SET full_name = ?, updated_at = now() WHERE id = ?", fullName, id)
        return findById(id)!!
    }

    fun updatePasswordHash(id: UUID, passwordHash: String) {
        jdbc.update("UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?", passwordHash, id)
    }

    /** Admin update (REQ-FUNC-014 / 012a). Every column is written; the service resolves "absent = unchanged". */
    fun updateAdminFields(
        id: UUID,
        email: String,
        fullName: String,
        department: String?,
        startDate: LocalDate?,
        role: Role,
    ): User {
        jdbc.update(
            """
            UPDATE users
               SET email = ?, full_name = ?, department = ?, start_date = ?, role = ?, updated_at = now()
             WHERE id = ?
            """.trimIndent(),
            email, fullName, department, startDate, role.name, id,
        )
        return findById(id)!!
    }

    fun updateStatus(id: UUID, status: UserStatus): User {
        jdbc.update("UPDATE users SET status = ?, updated_at = now() WHERE id = ?", status.name, id)
        return findById(id)!!
    }

    companion object {
        val USER_SORT = SortWhitelist(
            mapOf(
                "fullName" to "full_name", "email" to "email", "role" to "role", "status" to "status",
                "department" to "department", "startDate" to "start_date", "invitedAt" to "invited_at",
                "createdAt" to "created_at",
            ),
            Sort("fullName", SortDirection.ASC),
        )

        val COLUMNS = listOf(
            "id", "email", "password_hash", "role", "status", "full_name", "department", "start_date",
            "created_by_id", "invited_at", "activated_at", "created_at", "updated_at",
        )

        private val SELECT = "SELECT ${COLUMNS.joinToString(", ")} FROM users"

        val MAPPER = RowMapper<User> { rs: ResultSet, _ ->
            User(
                id = rs.getObject("id", UUID::class.java),
                email = rs.getString("email"),
                passwordHash = rs.getString("password_hash"),
                role = Role.valueOf(rs.getString("role")),
                status = UserStatus.valueOf(rs.getString("status")),
                fullName = rs.getString("full_name"),
                department = rs.getString("department"),
                startDate = rs.getObject("start_date", LocalDate::class.java),
                createdById = rs.getObject("created_by_id", UUID::class.java),
                invitedAt = rs.getObject("invited_at", java.time.OffsetDateTime::class.java).toInstant(),
                activatedAt = rs.getObject("activated_at", java.time.OffsetDateTime::class.java)?.toInstant(),
                createdAt = rs.getObject("created_at", java.time.OffsetDateTime::class.java).toInstant(),
                updatedAt = rs.getObject("updated_at", java.time.OffsetDateTime::class.java).toInstant(),
            )
        }
    }
}
