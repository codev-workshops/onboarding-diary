package com.onboardingdiary

import com.onboardingdiary.issue.IssueRepository
import com.onboardingdiary.issue.IssueSeverity
import com.onboardingdiary.issue.IssueStatus
import com.onboardingdiary.user.Role
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient.ResponseSpec
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@ActiveProfiles("dev")
class IssueIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var issueRepository: IssueRepository

    private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)

    private fun body(
        entryDate: LocalDate = today,
        title: String? = "VPN keeps dropping",
        severity: String? = "MEDIUM",
        status: String? = null,
        resolutionNotes: String? = null,
        description: String? = null,
    ) = buildMap<String, Any?> {
        put("entryDate", entryDate.toString())
        put("title", title)
        put("severity", severity)
        if (status != null) put("status", status)
        if (resolutionNotes != null) put("resolutionNotes", resolutionNotes)
        if (description != null) put("description", description)
    }

    private fun create(token: String, vararg overrides: Pair<String, Any?>): UUID =
        post("/api/v1/issues", body() + overrides.toMap(), token).expectStatus().isCreated.json().jsonId()

    private fun createIssue(token: String, entryDate: LocalDate, severity: String, status: String, title: String = "i", notes: String? = null): UUID =
        post("/api/v1/issues", body(entryDate = entryDate, title = title, severity = severity, status = status, resolutionNotes = notes), token)
            .expectStatus().isCreated.json().jsonId()

    private fun assign(recruitId: UUID, managerId: UUID) =
        post("/api/v1/assignments", mapOf("recruitId" to recruitId, "managerId" to managerId), adminToken()).expectStatus().isCreated

    private fun ResponseSpec.expectTotal(n: Int) = expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(n)

    // ---- CRUD -------------------------------------------------------------

    @Test
    fun `create defaults status OPEN and returns 201`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        post("/api/v1/issues", body(description = "  "), token)
            .expectStatus().isCreated
            .expectHeader().valueEquals("ETag", "\"1\"")
            .expectBody()
            .jsonPath("$.id").isNotEmpty
            .jsonPath("$.recruitId").isEqualTo(recruit.id.toString())
            .jsonPath("$.entryDate").isEqualTo(today.toString())
            .jsonPath("$.title").isEqualTo("VPN keeps dropping")
            .jsonPath("$.description").isEqualTo(null)
            .jsonPath("$.severity").isEqualTo("MEDIUM")
            .jsonPath("$.status").isEqualTo("OPEN")
            .jsonPath("$.resolutionNotes").isEqualTo(null)
            .jsonPath("$.version").isEqualTo(1)
            .jsonPath("$.createdAt").isNotEmpty
            .jsonPath("$.updatedAt").isNotEmpty
    }

    @Test
    fun `get update and delete own issue, deleted issue is 404 afterwards`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token, "severity" to "HIGH")

        get("/api/v1/issues/$id", token).expectStatus().isOk.expectBody().jsonPath("$.severity").isEqualTo("HIGH")

        put(
            "/api/v1/issues/$id",
            body(entryDate = today.minusDays(1), title = "VPN drops every hour", severity = "CRITICAL", status = "IN_PROGRESS", description = "IT is looking"),
            token,
        ).expectStatus().isOk
            .expectBody()
            .jsonPath("$.title").isEqualTo("VPN drops every hour")
            .jsonPath("$.entryDate").isEqualTo(today.minusDays(1).toString())
            .jsonPath("$.severity").isEqualTo("CRITICAL")
            .jsonPath("$.status").isEqualTo("IN_PROGRESS")
            .jsonPath("$.description").isEqualTo("IT is looking")
            .jsonPath("$.version").isEqualTo(2)

        delete("/api/v1/issues/$id", token).expectStatus().isNoContent
        get("/api/v1/issues/$id", token).expectError(404, "NOT_FOUND")
        delete("/api/v1/issues/$id", token).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `list is paginated with correct totals and default sort entryDate desc`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        for (i in 0 until 5) createIssue(token, today.minusDays(i.toLong()), "LOW", "OPEN", title = "i$i")

        get("/api/v1/issues?size=2", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(5)
            .jsonPath("$.totalPages").isEqualTo(3)
            .jsonPath("$.page").isEqualTo(0)
            .jsonPath("$.size").isEqualTo(2)
            .jsonPath("$.items.length()").isEqualTo(2)
            .jsonPath("$.items[0].title").isEqualTo("i0")
            .jsonPath("$.items[1].title").isEqualTo("i1")
        get("/api/v1/issues?size=2&page=2", token)
            .expectStatus().isOk.expectBody().jsonPath("$.items.length()").isEqualTo(1).jsonPath("$.items[0].title").isEqualTo("i4")
        get("/api/v1/issues?sort=nope,asc", token).expectError(400, "VALIDATION_FAILED")
    }

    @Test
    fun `severity sort ranks CRITICAL over HIGH over MEDIUM over LOW rather than alphabetically`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        for (sev in listOf("MEDIUM", "LOW", "CRITICAL", "HIGH")) createIssue(token, today, sev, "OPEN", title = sev)

        get("/api/v1/issues?sort=severity,desc", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.items[0].severity").isEqualTo("CRITICAL")
            .jsonPath("$.items[1].severity").isEqualTo("HIGH")
            .jsonPath("$.items[2].severity").isEqualTo("MEDIUM")
            .jsonPath("$.items[3].severity").isEqualTo("LOW")
        get("/api/v1/issues?sort=severity,asc", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.items[0].severity").isEqualTo("LOW")
            .jsonPath("$.items[3].severity").isEqualTo("CRITICAL")
    }

    // ---- filters ----------------------------------------------------------

    @Test
    fun `date status and severity filters and their combination narrow the list`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        createIssue(token, today, "HIGH", "OPEN")
        createIssue(token, today.minusDays(3), "HIGH", "IN_PROGRESS")
        createIssue(token, today.minusDays(10), "LOW", "IN_PROGRESS")
        createIssue(token, today.minusDays(20), "CRITICAL", "RESOLVED", notes = "Replaced the dock")

        get("/api/v1/issues", token).expectTotal(4)
        get("/api/v1/issues?from=${today.minusDays(5)}", token).expectTotal(2)
        get("/api/v1/issues?to=${today.minusDays(5)}", token).expectTotal(2)
        get("/api/v1/issues?from=${today.minusDays(10)}&to=${today.minusDays(3)}", token).expectTotal(2)
        get("/api/v1/issues?severity=HIGH", token).expectTotal(2)
        get("/api/v1/issues?severity=CRITICAL", token).expectTotal(1)
        get("/api/v1/issues?severity=MEDIUM", token).expectTotal(0)
        get("/api/v1/issues?status=IN_PROGRESS", token).expectTotal(2)
        get("/api/v1/issues?status=RESOLVED", token).expectTotal(1)
        get("/api/v1/issues?status=IN_PROGRESS&severity=HIGH", token).expectTotal(1)
        get("/api/v1/issues?status=IN_PROGRESS&severity=HIGH&from=${today.minusDays(2)}", token).expectTotal(0)
        get("/api/v1/issues?severity=LOW&from=${today.minusDays(30)}&to=${today.minusDays(4)}", token).expectTotal(1)
    }

    @Test
    fun `invalid filters are 400 with field details`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        get("/api/v1/issues?status=WAITING", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("status")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_ENUM")
        get("/api/v1/issues?severity=urgent", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("severity")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_ENUM")
        get("/api/v1/issues?from=2026-13-01", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("from")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_FORMAT")
        get("/api/v1/issues?from=2026-02-01&to=2026-01-01", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
    }

    // ---- validation -------------------------------------------------------

    @Test
    fun `validation failures are 400 with one detail per field`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/issues", mapOf("title" to " ", "description" to "x".repeat(4001), "resolutionNotes" to "x".repeat(4001)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'entryDate')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'title')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'severity')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'description')].code").isEqualTo("TOO_LONG")
            .jsonPath("$.details[?(@.field == 'resolutionNotes')].code").isEqualTo("TOO_LONG")
        post("/api/v1/issues", body(title = "x".repeat(201)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("title")
            .jsonPath("$.details[0].code").isEqualTo("TOO_LONG")
        post("/api/v1/issues", body(severity = "URGENT"), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("severity")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_ENUM")
        post("/api/v1/issues", body() + ("entryDate" to "yesterday"), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("entryDate")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_FORMAT")
        post("/api/v1/issues", body(entryDate = today.plusDays(2)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("entryDate")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
    }

    // ---- INV-07: resolution notes -----------------------------------------

    @Test
    fun `RESOLVED or CLOSED without non-blank resolution notes is 422 RESOLUTION_NOTES_REQUIRED`() {
        val token = login(active(Role.NEW_RECRUIT).email)

        post("/api/v1/issues", body(status = "RESOLVED"), token)
            .expectError(422, "RESOLUTION_NOTES_REQUIRED")
            .jsonPath("$.details[0].field").isEqualTo("resolutionNotes")
            .jsonPath("$.details[0].code").isEqualTo("REQUIRED")
        post("/api/v1/issues", body(status = "RESOLVED", resolutionNotes = "   "), token).expectError(422, "RESOLUTION_NOTES_REQUIRED")
        get("/api/v1/issues", token).expectTotal(0)

        val id = create(token)
        put("/api/v1/issues/$id", body(status = "RESOLVED"), token).expectError(422, "RESOLUTION_NOTES_REQUIRED")
        put("/api/v1/issues/$id", body(status = "RESOLVED", resolutionNotes = " \n"), token).expectError(422, "RESOLUTION_NOTES_REQUIRED")
        get("/api/v1/issues/$id", token).expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("OPEN").jsonPath("$.version").isEqualTo(1)

        put("/api/v1/issues/$id", body(status = "RESOLVED", resolutionNotes = "Reinstalled the VPN client"), token)
            .expectStatus().isOk.expectBody()
            .jsonPath("$.status").isEqualTo("RESOLVED")
            .jsonPath("$.resolutionNotes").isEqualTo("Reinstalled the VPN client")

        // Clearing the notes while staying RESOLVED (self transition) is still a violation.
        put("/api/v1/issues/$id", body(status = "RESOLVED"), token).expectError(422, "RESOLUTION_NOTES_REQUIRED")
        put("/api/v1/issues/$id", body(status = "CLOSED"), token).expectError(422, "RESOLUTION_NOTES_REQUIRED")
        put("/api/v1/issues/$id", body(status = "CLOSED", resolutionNotes = "Verified for a week"), token)
            .expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("CLOSED")
    }

    @Test
    fun `notes are optional and kept for OPEN and IN_PROGRESS`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token, "resolutionNotes" to "early hint")
        get("/api/v1/issues/$id", token).expectStatus().isOk.expectBody().jsonPath("$.resolutionNotes").isEqualTo("early hint")
        put("/api/v1/issues/$id", body(status = "IN_PROGRESS", resolutionNotes = ""), token)
            .expectStatus().isOk.expectBody().jsonPath("$.resolutionNotes").isEqualTo(null)
    }

    // ---- lifecycle --------------------------------------------------------

    @Test
    fun `update requires status and an allowed transition, OPEN to CLOSED directly is 422`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/issues/$id", body(), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'status')].code").isEqualTo("REQUIRED")

        put("/api/v1/issues/$id", body(status = "CLOSED", resolutionNotes = "done"), token)
            .expectError(422, "INVALID_STATE_TRANSITION")
            .jsonPath("$.details[0].field").isEqualTo("status")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_TRANSITION")
        // Transition is checked before INV-07, so OPEN -> CLOSED without notes is still a transition error.
        put("/api/v1/issues/$id", body(status = "CLOSED"), token).expectError(422, "INVALID_STATE_TRANSITION")
        get("/api/v1/issues/$id", token).expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("OPEN")

        put("/api/v1/issues/$id", body(status = "IN_PROGRESS"), token).expectStatus().isOk
        put("/api/v1/issues/$id", body(status = "OPEN"), token).expectError(422, "INVALID_STATE_TRANSITION")
        put("/api/v1/issues/$id", body(status = "CLOSED", resolutionNotes = "done"), token).expectError(422, "INVALID_STATE_TRANSITION")
        put("/api/v1/issues/$id", body(status = "RESOLVED", resolutionNotes = "done"), token).expectStatus().isOk
        put("/api/v1/issues/$id", body(status = "IN_PROGRESS"), token).expectStatus().isOk // reopen
        put("/api/v1/issues/$id", body(status = "RESOLVED", resolutionNotes = "done again"), token).expectStatus().isOk
        put("/api/v1/issues/$id", body(status = "CLOSED", resolutionNotes = "done again"), token).expectStatus().isOk
        put("/api/v1/issues/$id", body(status = "RESOLVED", resolutionNotes = "x"), token).expectError(422, "INVALID_STATE_TRANSITION")
        put("/api/v1/issues/$id", body(status = "IN_PROGRESS"), token)
            .expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("IN_PROGRESS")
    }

    @Test
    fun `update is a compare-and-set on the row version, so a concurrent edit cannot bypass the state machine`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/issues/$id", body(status = "RESOLVED", resolutionNotes = "fixed"), token).expectStatus().isOk

        val applied = issueRepository.update(
            id = id,
            entryDate = today,
            title = "stale",
            description = null,
            severity = IssueSeverity.LOW,
            status = IssueStatus.IN_PROGRESS,
            resolutionNotes = null,
            expectedVersion = 1,
        )

        assertFalse(applied)
        val latest = issueRepository.findById(id)!!
        assertEquals(IssueStatus.RESOLVED, latest.status)
        assertEquals(2, latest.version)
    }

    @Test
    fun `stale If-Match is 409 CONFLICT and a fresh weak ETag succeeds`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/issues/$id", body(title = "first editor", status = "OPEN"), token, ifMatch = "\"1\"").expectStatus().isOk
        put("/api/v1/issues/$id", body(title = "second editor", status = "OPEN"), token, ifMatch = "\"1\"").expectError(409, "CONFLICT")
        assertEquals("first editor", issueRepository.findById(id)!!.title)
        put("/api/v1/issues/$id", body(title = "second editor", status = "OPEN"), token, ifMatch = "W/\"2\"")
            .expectStatus().isOk.expectHeader().valueEquals("ETag", "\"3\"").expectBody().jsonPath("$.version").isEqualTo(3)
        put("/api/v1/issues/$id", body(status = "OPEN"), token, ifMatch = "abc")
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("If-Match")
    }

    // ---- ownership & roles -------------------------------------------------

    @Test
    fun `foreign issue ids are 404 for recruits on GET PUT and DELETE`() {
        val owner = login(active(Role.NEW_RECRUIT).email)
        val other = login(active(Role.NEW_RECRUIT).email)
        val id = create(owner)

        get("/api/v1/issues/$id", other).expectError(404, "NOT_FOUND")
        put("/api/v1/issues/$id", body(status = "OPEN"), other).expectError(404, "NOT_FOUND")
        delete("/api/v1/issues/$id", other).expectError(404, "NOT_FOUND")
        get("/api/v1/issues/${UUID.randomUUID()}", owner).expectError(404, "NOT_FOUND")
        get("/api/v1/issues/$id", owner).expectStatus().isOk
        get("/api/v1/issues", other).expectTotal(0)
    }

    @Test
    fun `recruit passing a foreign recruitId is 403 and self recruitId is allowed`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        create(token)
        get("/api/v1/issues?recruitId=${recruit.id}", token).expectTotal(1)
        get("/api/v1/issues?recruitId=${UUID.randomUUID()}", token).expectError(403, "FORBIDDEN")
    }

    @Test
    fun `manager access follows the live assignment and is read-only`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val otherManager = active(Role.MANAGER)
        val recruitToken = login(recruit.email)
        val managerToken = login(manager.email)
        val id = create(recruitToken)

        get("/api/v1/issues", managerToken).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("recruitId")
        get("/api/v1/issues?recruitId=${recruit.id}", managerToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/issues/$id", managerToken).expectError(404, "NOT_FOUND")

        assign(recruit.id, manager.id)
        get("/api/v1/issues?recruitId=${recruit.id}", managerToken).expectTotal(1)
        get("/api/v1/issues?recruitId=${recruit.id}&severity=MEDIUM", managerToken).expectTotal(1)
        get("/api/v1/issues/$id", managerToken).expectStatus().isOk.expectBody().jsonPath("$.id").isEqualTo(id.toString())

        post("/api/v1/issues", body(), managerToken).expectError(403, "FORBIDDEN")
        put("/api/v1/issues/$id", body(status = "OPEN"), managerToken).expectError(403, "FORBIDDEN")
        delete("/api/v1/issues/$id", managerToken).expectError(403, "FORBIDDEN")

        assign(recruit.id, otherManager.id)
        get("/api/v1/issues?recruitId=${recruit.id}", managerToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/issues/$id", managerToken).expectError(404, "NOT_FOUND")
        get("/api/v1/issues?recruitId=${recruit.id}", login(otherManager.email)).expectTotal(1)
    }

    @Test
    fun `admin can read any recruit and delete but not create or update`() {
        val recruit = active(Role.NEW_RECRUIT)
        val recruitToken = login(recruit.email)
        val admin = adminToken()
        val id = create(recruitToken)

        get("/api/v1/issues", admin).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/issues?recruitId=${recruit.id}", admin).expectTotal(1)
        get("/api/v1/issues?recruitId=${UUID.randomUUID()}", admin).expectError(404, "NOT_FOUND")
        get("/api/v1/issues/$id", admin).expectStatus().isOk

        post("/api/v1/issues", body(), admin).expectError(403, "FORBIDDEN")
        put("/api/v1/issues/$id", body(status = "OPEN"), admin).expectError(403, "FORBIDDEN")

        delete("/api/v1/issues/$id", admin).expectStatus().isNoContent
        get("/api/v1/issues/$id", recruitToken).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `issues require authentication`() {
        get("/api/v1/issues", null).expectError(401, "UNAUTHENTICATED")
        post("/api/v1/issues", body(), null).expectError(401, "UNAUTHENTICATED")
    }
}
