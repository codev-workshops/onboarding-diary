package com.onboardingdiary.user

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

    fun countByRole(role: Role): Long =
        jdbc.queryForObject("SELECT count(*) FROM users WHERE role = ?", Long::class.java, role.name) ?: 0L

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

    fun activate(
        id: UUID,
        passwordHash: String,
        fullName: String?,
        department: String?,
        startDate: LocalDate?,
    ): User? {
        val rows = jdbc.update(
            """
            UPDATE users
               SET password_hash = ?,
                   status = 'ACTIVE',
                   activated_at = now(),
                   full_name = COALESCE(?, full_name),
                   department = COALESCE(?, department),
                   start_date = COALESCE(?, start_date),
                   updated_at = now()
             WHERE id = ? AND status = 'INVITED'
            """.trimIndent(),
            passwordHash, fullName, department, startDate, id,
        )
        return if (rows == 1) findById(id) else null
    }

    fun updateProfile(id: UUID, fullName: String, department: String?, startDate: LocalDate?): User {
        jdbc.update(
            "UPDATE users SET full_name = ?, department = ?, start_date = ?, updated_at = now() WHERE id = ?",
            fullName, department, startDate, id,
        )
        return findById(id)!!
    }

    fun updatePasswordHash(id: UUID, passwordHash: String) {
        jdbc.update("UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?", passwordHash, id)
    }

    companion object {
        private const val SELECT = """
            SELECT id, email, password_hash, role, status, full_name, department, start_date,
                   created_by_id, invited_at, activated_at, created_at, updated_at
              FROM users
        """

        private val MAPPER = RowMapper<User> { rs: ResultSet, _ ->
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
