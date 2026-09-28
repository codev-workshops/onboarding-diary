package com.onboardingdiary

import com.onboardingdiary.api.dashboard.DashboardService
import com.onboardingdiary.api.dashboard.TaskSummary
import com.onboardingdiary.dashboard.DashboardRepository
import com.onboardingdiary.dashboard.RecentEntryKind
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.feedback.FeedbackVisibility
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.user.Role
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient.BodyContentSpec
import tools.jackson.databind.ObjectMapper
import java.sql.Timestamp
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID

@ActiveProfiles("dev")
class DashboardIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var dashboardRepository: DashboardRepository
    @Autowired lateinit var scope: RecruitScopeResolver
    @Autowired lateinit var objectMapper: ObjectMapper

    private val base: Instant = Instant.parse("2026-09-01T09:00:00Z")
    private val day: LocalDate = LocalDate.parse("2026-09-01")

    private fun at(minute: Int): Timestamp = Timestamp.from(base.plus(minute.toLong(), ChronoUnit.MINUTES))

    private fun task(recruit: UUID, minute: Int, status: String, title: String = "task@$minute"): UUID = UUID.randomUUID().also {
        jdbc.update(
            "INSERT INTO task_entries (id, recruit_id, entry_date, title, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'TRAINING', ?, ?, ?)",
            it, recruit, day, title, status, at(minute), at(minute),
        )
    }

    private fun issue(recruit: UUID, minute: Int, status: String, severity: String, title: String = "issue@$minute"): UUID = UUID.randomUUID().also {
        val notes = if (status == "RESOLVED" || status == "CLOSED") "done" else null
        jdbc.update(
            "INSERT INTO issue_entries (id, recruit_id, entry_date, title, severity, status, resolution_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            it, recruit, day, title, severity, status, notes, at(minute), at(minute),
        )
    }

    private fun feedback(recruit: UUID, minute: Int, type: String, subject: String = "feedback@$minute"): UUID = UUID.randomUUID().also {
        jdbc.update(
            "INSERT INTO feedback_notes (id, recruit_id, entry_date, subject, type, details, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'details', ?, ?)",
            it, recruit, day, subject, type, at(minute), at(minute),
        )
    }

    private fun note(recruit: UUID, minute: Int, title: String = "note@$minute"): UUID = UUID.randomUUID().also {
        jdbc.update(
            "INSERT INTO additional_notes (id, recruit_id, entry_date, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, 'content', ?, ?)",
            it, recruit, day, title, at(minute), at(minute),
        )
    }

    private fun assign(recruitId: UUID, managerId: UUID) =
        post("/api/v1/assignments", mapOf("recruitId" to recruitId, "managerId" to managerId), adminToken()).expectStatus().isCreated

    /** Known fixture: 7 tasks, 8 issues, 4 feedback notes, 3 notes, interleaved by `createdAt` (minute offsets). */
    private class Fixture(val recruit: UUID) {
        lateinit var recentOpenIssues: List<UUID>
        lateinit var recentWithFeedback: List<Pair<String, UUID>>
        lateinit var recentWithoutFeedback: List<Pair<String, UUID>>
    }

    private fun seed(recruit: UUID): Fixture {
        val f = Fixture(recruit)
        val all = mutableListOf<Triple<Int, String, UUID>>()
        fun add(minute: Int, kind: String, id: UUID) = all.add(Triple(minute, kind, id))

        // tasks: TODO 2, IN_PROGRESS 1, BLOCKED 1, DONE 3 → 3/7 = 42.86 % → 43
        listOf(1 to "TODO", 5 to "TODO", 9 to "IN_PROGRESS", 13 to "BLOCKED", 17 to "DONE", 21 to "DONE", 25 to "DONE")
            .forEach { (m, s) -> add(m, "TASK", task(recruit, m, s)) }
        // issues: OPEN 4, IN_PROGRESS 2, RESOLVED 1, CLOSED 1; LOW 2, MEDIUM 2, HIGH 3, CRITICAL 1
        val issues = listOf(
            Triple(2, "OPEN", "LOW"), Triple(6, "IN_PROGRESS", "MEDIUM"), Triple(10, "RESOLVED", "HIGH"), Triple(14, "OPEN", "HIGH"),
            Triple(18, "CLOSED", "LOW"), Triple(22, "OPEN", "CRITICAL"), Triple(26, "IN_PROGRESS", "HIGH"), Triple(27, "OPEN", "MEDIUM"),
        ).map { (m, s, sev) -> Triple(m, s, issue(recruit, m, s, sev)) }
        issues.forEach { (m, _, id) -> add(m, "ISSUE", id) }
        f.recentOpenIssues = issues.filter { it.second == "OPEN" || it.second == "IN_PROGRESS" }.sortedByDescending { it.first }.take(5).map { it.third }
        // feedback: POSITIVE 2, SUGGESTION 1, CONCERN 1 (two of them among the 10 newest)
        listOf(3 to "POSITIVE", 11 to "SUGGESTION", 24 to "POSITIVE", 28 to "CONCERN").forEach { (m, t) -> add(m, "FEEDBACK", feedback(recruit, m, t)) }
        // notes: 3
        listOf(4, 20, 23).forEach { m -> add(m, "NOTE", note(recruit, m)) }

        val newestFirst = all.sortedByDescending { it.first }.map { it.second to it.third }
        f.recentWithFeedback = newestFirst.take(10)
        f.recentWithoutFeedback = newestFirst.filter { it.first != "FEEDBACK" }.take(10)
        return f
    }

    private fun BodyContentSpec.expectCounts(f: Fixture): BodyContentSpec = this
        .jsonPath("$.recruitId").isEqualTo(f.recruit.toString())
        .jsonPath("$.tasks.total").isEqualTo(7)
        .jsonPath("$.tasks.byStatus.TODO").isEqualTo(2)
        .jsonPath("$.tasks.byStatus.IN_PROGRESS").isEqualTo(1)
        .jsonPath("$.tasks.byStatus.BLOCKED").isEqualTo(1)
        .jsonPath("$.tasks.byStatus.DONE").isEqualTo(3)
        .jsonPath("$.tasks.completionPercent").isEqualTo(43)
        .jsonPath("$.issues.total").isEqualTo(8)
        .jsonPath("$.issues.open").isEqualTo(6)
        .jsonPath("$.issues.byStatus.OPEN").isEqualTo(4)
        .jsonPath("$.issues.byStatus.IN_PROGRESS").isEqualTo(2)
        .jsonPath("$.issues.byStatus.RESOLVED").isEqualTo(1)
        .jsonPath("$.issues.byStatus.CLOSED").isEqualTo(1)
        .jsonPath("$.issues.bySeverity.LOW").isEqualTo(2)
        .jsonPath("$.issues.bySeverity.MEDIUM").isEqualTo(2)
        .jsonPath("$.issues.bySeverity.HIGH").isEqualTo(3)
        .jsonPath("$.issues.bySeverity.CRITICAL").isEqualTo(1)
        .jsonPath("$.issues.recentOpen.length()").isEqualTo(5)
        .jsonPath("$.issues.recentOpen[*].id").isEqualTo(f.recentOpenIssues.map(UUID::toString))
        .jsonPath("$.issues.recentOpen[0].title").isEqualTo("issue@27")
        .jsonPath("$.issues.recentOpen[0].severity").isEqualTo("MEDIUM")
        .jsonPath("$.issues.recentOpen[0].status").isEqualTo("OPEN")
        .jsonPath("$.issues.recentOpen[0].version").isEqualTo(1)
        .jsonPath("$.notes.total").isEqualTo(3)

    private fun BodyContentSpec.expectFeedbackAndRecent(f: Fixture): BodyContentSpec = this
        .jsonPath("$.feedback.total").isEqualTo(4)
        .jsonPath("$.feedback.byType.POSITIVE").isEqualTo(2)
        .jsonPath("$.feedback.byType.SUGGESTION").isEqualTo(1)
        .jsonPath("$.feedback.byType.CONCERN").isEqualTo(1)
        .jsonPath("$.recentEntries.length()").isEqualTo(10)
        .jsonPath("$.recentEntries[*].kind").isEqualTo(f.recentWithFeedback.map { it.first })
        .jsonPath("$.recentEntries[*].id").isEqualTo(f.recentWithFeedback.map { it.second.toString() })
        .jsonPath("$.recentEntries[0].kind").isEqualTo("FEEDBACK")
        .jsonPath("$.recentEntries[0].title").isEqualTo("feedback@28")
        .jsonPath("$.recentEntries[0].entryDate").isEqualTo(day.toString())
        .jsonPath("$.recentEntries[0].createdAt").isEqualTo("2026-09-01T09:28:00Z")

    // ---- numbers ------------------------------------------------------------

    @Test
    fun `recruit sees every count, the 5 newest open issues and the 10 newest entries across kinds`() {
        val recruit = active(Role.NEW_RECRUIT)
        val f = seed(recruit.id)
        val token = login(recruit.email)

        get("/api/v1/dashboard", token).expectStatus().isOk.expectBody().expectCounts(f).expectFeedbackAndRecent(f)
        get("/api/v1/dashboard?recruitId=${recruit.id}", token).expectStatus().isOk.expectBody().expectCounts(f)
    }

    @Test
    fun `recent entries mix all four kinds and are ordered by createdAt desc`() {
        val recruit = active(Role.NEW_RECRUIT)
        seed(recruit.id)
        get("/api/v1/dashboard", login(recruit.email)).expectStatus().isOk.expectBody()
            .jsonPath("$.recentEntries[*].title").isEqualTo(
                listOf("feedback@28", "issue@27", "issue@26", "task@25", "feedback@24", "note@23", "issue@22", "task@21", "note@20", "issue@18"),
            )
            .jsonPath("$.recentEntries[*].kind").isEqualTo(
                listOf("FEEDBACK", "ISSUE", "ISSUE", "TASK", "FEEDBACK", "NOTE", "ISSUE", "TASK", "NOTE", "ISSUE"),
            )
    }

    @Test
    fun `empty dashboard has zero counts, 0 percent completion and empty lists`() {
        val recruit = active(Role.NEW_RECRUIT)
        get("/api/v1/dashboard", login(recruit.email)).expectStatus().isOk.expectBody()
            .jsonPath("$.tasks.total").isEqualTo(0)
            .jsonPath("$.tasks.completionPercent").isEqualTo(0)
            .jsonPath("$.tasks.byStatus.TODO").isEqualTo(0)
            .jsonPath("$.tasks.byStatus.DONE").isEqualTo(0)
            .jsonPath("$.issues.total").isEqualTo(0)
            .jsonPath("$.issues.open").isEqualTo(0)
            .jsonPath("$.issues.bySeverity.CRITICAL").isEqualTo(0)
            .jsonPath("$.issues.byStatus.CLOSED").isEqualTo(0)
            .jsonPath("$.issues.recentOpen.length()").isEqualTo(0)
            .jsonPath("$.feedback.total").isEqualTo(0)
            .jsonPath("$.feedback.byType.CONCERN").isEqualTo(0)
            .jsonPath("$.notes.total").isEqualTo(0)
            .jsonPath("$.recentEntries.length()").isEqualTo(0)
    }

    @Test
    fun `completion percent is DONE over total rounded half up`() {
        fun percentFor(done: Int, other: Int): Any? {
            val recruit = active(Role.NEW_RECRUIT)
            repeat(done) { task(recruit.id, it, "DONE") }
            repeat(other) { task(recruit.id, 100 + it, "BLOCKED") }
            return get("/api/v1/dashboard", login(recruit.email)).expectStatus().isOk.json()
                .let { objectMapper.readTree(it).path("tasks").path("completionPercent").numberValue() }
        }
        assertEquals(50, percentFor(done = 2, other = 2))
        assertEquals(67, percentFor(done = 2, other = 1))
        assertEquals(13, percentFor(done = 1, other = 7))
        assertEquals(100, percentFor(done = 3, other = 0))
        assertEquals(0, percentFor(done = 0, other = 3))

        assertEquals(0, TaskSummary.completionPercent(0, 0))
        assertEquals(33, TaskSummary.completionPercent(1, 3))
        assertEquals(1, TaskSummary.completionPercent(1, 200))
        assertEquals(0, TaskSummary.completionPercent(1, 201))
        assertEquals(100, TaskSummary.completionPercent(199, 200))
        assertEquals(99, TaskSummary.completionPercent(397, 400))
    }

    @Test
    fun `counts are scoped to the target recruit`() {
        val recruit = active(Role.NEW_RECRUIT)
        val other = active(Role.NEW_RECRUIT)
        val f = seed(recruit.id)
        task(other.id, 50, "DONE")
        issue(other.id, 51, "OPEN", "HIGH")
        feedback(other.id, 52, "CONCERN")
        note(other.id, 53)

        get("/api/v1/dashboard", login(recruit.email)).expectStatus().isOk.expectBody().expectCounts(f).expectFeedbackAndRecent(f)
        get("/api/v1/dashboard", login(other.email)).expectStatus().isOk.expectBody()
            .jsonPath("$.tasks.total").isEqualTo(1)
            .jsonPath("$.tasks.completionPercent").isEqualTo(100)
            .jsonPath("$.issues.open").isEqualTo(1)
            .jsonPath("$.feedback.total").isEqualTo(1)
            .jsonPath("$.notes.total").isEqualTo(1)
            .jsonPath("$.recentEntries.length()").isEqualTo(4)
    }

    // ---- role scoping + feedback visibility (D3) ---------------------------

    @Test
    fun `assigned manager and admin see the full dashboard including feedback`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val f = seed(recruit.id)
        assign(recruit.id, manager.id)

        get("/api/v1/dashboard?recruitId=${recruit.id}", login(manager.email)).expectStatus().isOk.expectBody()
            .expectCounts(f).expectFeedbackAndRecent(f)
        get("/api/v1/dashboard?recruitId=${recruit.id}", adminToken()).expectStatus().isOk.expectBody()
            .expectCounts(f).expectFeedbackAndRecent(f)
    }

    @Test
    fun `unassigned manager is 403 NOT_ASSIGNED and never sees counts`() {
        val recruit = active(Role.NEW_RECRUIT)
        val assigned = active(Role.MANAGER)
        val stranger = active(Role.MANAGER)
        seed(recruit.id)
        assign(recruit.id, assigned.id)

        get("/api/v1/dashboard?recruitId=${recruit.id}", login(stranger.email)).expectError(403, "NOT_ASSIGNED")
            .jsonPath("$.tasks").doesNotExist()
            .jsonPath("$.feedback").doesNotExist()
        get("/api/v1/dashboard", login(stranger.email)).expectError(400, "VALIDATION_FAILED")
    }

    @Test
    fun `manager whose assignment ended loses access`() {
        val recruit = active(Role.NEW_RECRUIT)
        val first = active(Role.MANAGER)
        val second = active(Role.MANAGER)
        seed(recruit.id)
        assign(recruit.id, first.id)
        assign(recruit.id, second.id)

        get("/api/v1/dashboard?recruitId=${recruit.id}", login(first.email)).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/dashboard?recruitId=${recruit.id}", login(second.email)).expectStatus().isOk
            .expectBody().jsonPath("$.feedback.total").isEqualTo(4)
    }

    @Test
    fun `caller failing FeedbackVisibility gets no feedback block and no FEEDBACK recent entries`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val f = seed(recruit.id)
        assign(recruit.id, manager.id)
        // Scope passes (assigned) but D3 denies: exercises the omission branch the real predicate cannot reach over HTTP today.
        val service = DashboardService(dashboardRepository, scope, FeedbackVisibility { _, _ -> false })

        val summary = runBlocking { service.summary(AuthenticatedUser(manager.id, manager.email, Role.MANAGER), recruit.id) }

        assertNull(summary.feedback)
        assertEquals(7, summary.tasks.total)
        assertEquals(8, summary.issues.total)
        assertEquals(3, summary.notes.total)
        assertEquals(10, summary.recentEntries.size)
        assertFalse(summary.recentEntries.any { it.kind == RecentEntryKind.FEEDBACK })
        assertEquals(f.recentWithoutFeedback.map { it.second }, summary.recentEntries.map { it.id })
        val json = objectMapper.readTree(objectMapper.writeValueAsString(summary))
        assertFalse(json.has("feedback"))
    }

    @Test
    fun `recruit cannot read another recruit and admin gets 404 for non-recruit targets`() {
        val recruit = active(Role.NEW_RECRUIT)
        val other = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)

        get("/api/v1/dashboard?recruitId=${other.id}", login(recruit.email)).expectError(403, "FORBIDDEN")
        get("/api/v1/dashboard", adminToken()).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/dashboard?recruitId=${manager.id}", adminToken()).expectError(404, "NOT_FOUND")
        get("/api/v1/dashboard?recruitId=${UUID.randomUUID()}", adminToken()).expectError(404, "NOT_FOUND")
        get("/api/v1/dashboard?recruitId=not-a-uuid", login(recruit.email)).expectError(400, "MALFORMED_REQUEST")
        get("/api/v1/dashboard", null).expectError(401, "UNAUTHENTICATED")
    }
}
