package com.onboardingdiary

import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles

@ActiveProfiles("dev")
class FlywayMigrationIT : AbstractIntegrationTest() {

    @Autowired
    lateinit var flyway: Flyway

    @Autowired
    lateinit var jdbc: JdbcTemplate

    @Test
    fun `migrations applied on boot validate cleanly against the container`() {
        assertDoesNotThrow { flyway.validate() }

        val applied = flyway.info().applied()
        assertEquals(listOf("1", "2", "3", "4", "5", "6", "7"), applied.map { it.version.version })
        assertTrue(flyway.info().pending().isEmpty())
    }

    @Test
    fun `baseline creates extensions and audit-column placeholder`() {
        val extensions = jdbc.queryForList("select extname from pg_extension", String::class.java)
        assertTrue(extensions.containsAll(listOf("pgcrypto", "citext")))

        val columns = jdbc.queryForList(
            "select column_name from information_schema.columns where table_name = 'schema_baseline'",
            String::class.java,
        )
        assertTrue(columns.containsAll(listOf("created_at", "updated_at")))
    }
}
