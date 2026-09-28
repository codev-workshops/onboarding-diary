package com.onboardingdiary

import com.onboardingdiary.api.report.ReportService
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.feedback.FeedbackVisibility
import com.onboardingdiary.report.CsvRenderer
import com.onboardingdiary.report.PdfRenderer
import com.onboardingdiary.report.ReportDocument
import com.onboardingdiary.report.ReportFormat
import com.onboardingdiary.report.ReportRange
import com.onboardingdiary.report.ReportRepository
import com.onboardingdiary.report.ReportType
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.UserRepository
import kotlinx.coroutines.runBlocking
import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient.ResponseSpec
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

@ActiveProfiles("dev")
class ReportIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var reportRepository: ReportRepository
    @Autowired lateinit var userRepository: UserRepository
    @Autowired lateinit var scope: RecruitScopeResolver
    @Autowired lateinit var clock: Clock

    private val from = "2026-03-01"
    private val to = "2026-03-31"

    private fun task(recruit: UUID, date: String, title: String) = jdbc.update(
        "INSERT INTO task_entries (id, recruit_id, entry_date, title, category, status) VALUES (?, ?, ?, ?, 'TRAINING', 'TODO')",
        UUID.randomUUID(), recruit, LocalDate.parse(date), title,
    )

    private fun issue(recruit: UUID, date: String, title: String) = jdbc.update(
        "INSERT INTO issue_entries (id, recruit_id, entry_date, title, severity, status) VALUES (?, ?, ?, ?, 'HIGH', 'OPEN')",
        UUID.randomUUID(), recruit, LocalDate.parse(date), title,
    )

    private fun feedback(recruit: UUID, date: String, subject: String) = jdbc.update(
        "INSERT INTO feedback_notes (id, recruit_id, entry_date, subject, type, details) VALUES (?, ?, ?, ?, 'POSITIVE', 'details')",
        UUID.randomUUID(), recruit, LocalDate.parse(date), subject,
    )

    /** 3 tasks, 2 issues, 1 feedback in range; one of each just outside (boundaries inclusive). */
    private fun seed(recruit: UUID) {
        task(recruit, from, "task-first-day")
        task(recruit, "2026-03-15", "task-mid, with comma")
        task(recruit, to, "task-last-day")
        task(recruit, "2026-02-28", "task-before")
        task(recruit, "2026-04-01", "task-after")
        issue(recruit, "2026-03-10", "issue-a")
        issue(recruit, "2026-03-20", "issue-b")
        issue(recruit, "2026-04-01", "issue-after")
        feedback(recruit, "2026-03-05", "feedback-a")
        feedback(recruit, "2026-02-01", "feedback-before")
    }

    private fun assign(recruitId: UUID, managerId: UUID) =
        post("/api/v1/assignments", mapOf("recruitId" to recruitId, "managerId" to managerId), adminToken()).expectStatus().isCreated

    private fun report(token: String?, type: String, format: String, recruitId: UUID? = null, from: String = this.from, to: String = this.to): ResponseSpec {
        val recruitQuery = recruitId?.let { "&recruitId=$it" } ?: ""
        return get("/api/v1/reports?from=$from&to=$to&type=$type&format=$format$recruitQuery", token)
    }

    private fun ResponseSpec.csvLines(): List<String> =
        expectStatus().isOk
            .expectHeader().contentTypeCompatibleWith("text/csv")
            .expectBody(String::class.java).returnResult().responseBody!!.removeSuffix("\r\n").split("\r\n")

    private fun ResponseSpec.bytes(): ByteArray = expectStatus().isOk.expectBody(ByteArray::class.java).returnResult().responseBody!!

    private fun pdfText(bytes: ByteArray): String = Loader.loadPDF(bytes).use { PDFTextStripper().getText(it) }

    // ---- content ------------------------------------------------------------

    @Test
    fun `CSV per type has the expected rows and inclusive bounds and RFC 4180 quoting`() {
        val recruit = active(Role.NEW_RECRUIT)
        seed(recruit.id)
        val token = login(recruit.email)

        val tasks = report(token, "TASKS", "CSV").csvLines()
        assertEquals(4, tasks.size)
        assertEquals("entryDate,title,category,status,priority,description", tasks[0])
        assertEquals(listOf("task-first-day", "\"task-mid, with comma\"", "task-last-day"), tasks.drop(1).map { it.split(",", limit = 2)[1].substringBefore(",TRAINING") })
        assertFalse(tasks.any { it.contains("before") || it.contains("after") })

        assertEquals(3, report(token, "ISSUES", "CSV").csvLines().size)
        assertEquals(2, report(token, "FEEDBACK", "CSV").csvLines().size)

        val combined = report(token, "COMBINED", "CSV").csvLines()
        assertEquals(7, combined.size)
        assertTrue(combined[0].startsWith("kind,entryDate,"))
        assertEquals(mapOf("TASK" to 3, "ISSUE" to 2, "FEEDBACK" to 1), combined.drop(1).groupingBy { it.substringBefore(',') }.eachCount())
    }

    @Test
    fun `headers carry content type, attachment filename and length`() {
        val recruit = active(Role.NEW_RECRUIT)
        seed(recruit.id)
        val token = login(recruit.email)

        report(token, "COMBINED", "PDF").expectStatus().isOk
            .expectHeader().contentType("application/pdf")
            .expectHeader().valueEquals(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"onboarding-report-${recruit.id}-${from}_$to.pdf\"")
            .expectHeader().exists(HttpHeaders.CONTENT_LENGTH)
            .expectHeader().doesNotExist("X-Report-Omitted")

        report(token, "TASKS", "CSV").expectStatus().isOk
            .expectHeader().contentTypeCompatibleWith("text/csv")
            .expectHeader().valueEquals(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"onboarding-report-${recruit.id}-${from}_$to.csv\"")
    }

    @Test
    fun `PDF is a valid document containing the sections`() {
        val recruit = active(Role.NEW_RECRUIT)
        seed(recruit.id)
        val bytes = report(login(recruit.email), "COMBINED", "PDF").bytes()
        assertEquals("%PDF-", bytes.copyOfRange(0, 5).toString(Charsets.US_ASCII))
        val text = pdfText(bytes)
        assertTrue(text.contains("Onboarding report"))
        assertTrue(text.contains("Tasks (3)") && text.contains("Issues (2)") && text.contains("Feedback (1)"))
        assertTrue(text.contains("task-mid, with comma"))
        assertFalse(text.contains("task-before"))
    }

    @Test
    fun `empty range still produces a document stating No entries in range`() {
        val recruit = active(Role.NEW_RECRUIT)
        seed(recruit.id)
        val token = login(recruit.email)

        val csv = report(token, "COMBINED", "CSV", from = "2025-01-01", to = "2025-01-31").csvLines()
        assertEquals(2, csv.size)
        assertTrue(csv[1].startsWith(ReportDocument.NO_ENTRIES))

        val pdf = report(token, "TASKS", "PDF", from = "2025-01-01", to = "2025-01-31").bytes()
        assertTrue(pdfText(pdf).contains(ReportDocument.NO_ENTRIES))
    }

    // ---- validation (INV-10) -------------------------------------------------

    @Test
    fun `invalid ranges and parameters are 400 VALIDATION_FAILED`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        report(token, "TASKS", "CSV", from = "2026-03-31", to = "2026-03-01").expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("to")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
        report(token, "TASKS", "CSV", from = "2026-01-01", to = "2027-01-03").expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
        report(token, "TASKS", "CSV", from = "2026-01-01", to = "2027-01-02").expectStatus().isOk
        get("/api/v1/reports?type=TASKS&format=CSV", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[*].field").isEqualTo(listOf("from", "to"))
            .jsonPath("$.details[0].code").isEqualTo("REQUIRED")
        report(token, "TASKS", "CSV", from = "yesterday").expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_FORMAT")
        report(token, "EVERYTHING", "CSV").expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].code").isEqualTo("INVALID_ENUM")
        report(token, "TASKS", "XLSX").expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("format")
        get("/api/v1/reports?from=$from&to=$to&type=TASKS", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("format").jsonPath("$.details[0].code").isEqualTo("REQUIRED")
    }

    // ---- scoping + visibility ------------------------------------------------

    @Test
    fun `scoping follows the dashboard rules`() {
        val recruit = active(Role.NEW_RECRUIT)
        val other = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val stranger = active(Role.MANAGER)
        seed(recruit.id)
        task(other.id, "2026-03-02", "other-task")
        assign(recruit.id, manager.id)

        // recruit: self only
        assertEquals(4, report(login(recruit.email), "TASKS", "CSV").csvLines().size)
        assertEquals(4, report(login(recruit.email), "TASKS", "CSV", recruitId = recruit.id).csvLines().size)
        report(login(recruit.email), "TASKS", "CSV", recruitId = other.id).expectError(403, "FORBIDDEN")

        // manager: assigned recruit only, recruitId required
        val managerToken = login(manager.email)
        assertEquals(7, report(managerToken, "COMBINED", "CSV", recruitId = recruit.id).csvLines().size)
        report(managerToken, "TASKS", "CSV", recruitId = other.id).expectError(403, "NOT_ASSIGNED")
        report(managerToken, "TASKS", "CSV").expectError(400, "VALIDATION_FAILED")
        report(login(stranger.email), "TASKS", "CSV", recruitId = recruit.id).expectError(403, "NOT_ASSIGNED")

        // admin: any recruit, 404 for non-recruits
        assertEquals(2, report(adminToken(), "TASKS", "CSV", recruitId = other.id).csvLines().size)
        report(adminToken(), "TASKS", "CSV", recruitId = manager.id).expectError(404, "NOT_FOUND")
        report(adminToken(), "TASKS", "CSV", recruitId = UUID.randomUUID()).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `manager whose assignment ended can no longer generate`() {
        val recruit = active(Role.NEW_RECRUIT)
        val first = active(Role.MANAGER)
        val second = active(Role.MANAGER)
        assign(recruit.id, first.id)
        assign(recruit.id, second.id)
        report(login(first.email), "FEEDBACK", "CSV", recruitId = recruit.id).expectError(403, "NOT_ASSIGNED")
        report(login(second.email), "FEEDBACK", "CSV", recruitId = recruit.id).expectStatus().isOk
    }

    @Test
    fun `without feedback visibility FEEDBACK is 403 and COMBINED omits feedback with X-Report-Omitted`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        seed(recruit.id)
        assign(recruit.id, manager.id)
        // Scope passes (assigned) but D3 denies: the real predicate cannot reach this branch over HTTP today.
        val service = ReportService(scope, FeedbackVisibility { _, _ -> false }, reportRepository, userRepository, listOf(CsvRenderer(), PdfRenderer()), clock)
        val principal = AuthenticatedUser(manager.id, manager.email, Role.MANAGER)
        val range = ReportRange(LocalDate.parse(from), LocalDate.parse(to))

        val e = runCatching { runBlocking { service.generate(principal, recruit.id, range, ReportType.FEEDBACK, ReportFormat.CSV) } }.exceptionOrNull()
        assertTrue(e is com.onboardingdiary.api.error.ForbiddenException, "expected ForbiddenException, got $e")

        val combined = runBlocking { service.generate(principal, recruit.id, range, ReportType.COMBINED, ReportFormat.CSV) }
        assertTrue(combined.feedbackOmitted)
        val lines = combined.bytes.toString(Charsets.UTF_8).removeSuffix("\r\n").split("\r\n")
        assertEquals(6, lines.size)
        assertFalse(lines.any { it.startsWith("FEEDBACK,") })

        val tasksOnly = runBlocking { service.generate(principal, recruit.id, range, ReportType.TASKS, ReportFormat.CSV) }
        assertFalse(tasksOnly.feedbackOmitted)

        val pdf = runBlocking { service.generate(principal, recruit.id, range, ReportType.COMBINED, ReportFormat.PDF) }
        assertTrue(pdf.feedbackOmitted)
        assertTrue(pdfText(pdf.bytes).contains("Feedback omitted"))
    }

    @Test
    fun `no token is 401 UNAUTHENTICATED`() {
        report(null, "TASKS", "CSV").expectError(401, "UNAUTHENTICATED")
    }
}
