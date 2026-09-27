package com.onboardingdiary

import com.onboardingdiary.feedback.FeedbackRepository
import com.onboardingdiary.user.Role
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient.ResponseSpec
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@ActiveProfiles("dev")
class FeedbackIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var feedbackRepository: FeedbackRepository

    private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)

    private fun body(
        entryDate: LocalDate = today,
        subject: String? = "Great pairing session",
        type: String? = "POSITIVE",
        details: String? = "The pairing session on day 3 really helped me ramp up.",
    ) = mapOf("entryDate" to entryDate.toString(), "subject" to subject, "type" to type, "details" to details)

    private fun create(token: String, entryDate: LocalDate = today, type: String = "POSITIVE", subject: String = "s"): UUID =
        post("/api/v1/feedback", body(entryDate = entryDate, subject = subject, type = type), token).expectStatus().isCreated.json().jsonId()

    private fun assign(recruitId: UUID, managerId: UUID) =
        post("/api/v1/assignments", mapOf("recruitId" to recruitId, "managerId" to managerId), adminToken()).expectStatus().isCreated

    private fun ResponseSpec.expectTotal(n: Int) = expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(n)

    // ---- CRUD -------------------------------------------------------------

    @Test
    fun `create returns 201 with the full representation and ETag`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        post("/api/v1/feedback", body(subject = "  Great pairing session  "), token)
            .expectStatus().isCreated
            .expectHeader().valueEquals("ETag", "\"1\"")
            .expectBody()
            .jsonPath("$.id").isNotEmpty
            .jsonPath("$.recruitId").isEqualTo(recruit.id.toString())
            .jsonPath("$.entryDate").isEqualTo(today.toString())
            .jsonPath("$.subject").isEqualTo("Great pairing session")
            .jsonPath("$.type").isEqualTo("POSITIVE")
            .jsonPath("$.details").isEqualTo("The pairing session on day 3 really helped me ramp up.")
            .jsonPath("$.version").isEqualTo(1)
            .jsonPath("$.createdAt").isNotEmpty
            .jsonPath("$.updatedAt").isNotEmpty
    }

    @Test
    fun `get update and delete own note, deleted note is 404 afterwards`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)

        get("/api/v1/feedback/$id", token).expectStatus().isOk.expectBody().jsonPath("$.type").isEqualTo("POSITIVE")

        put("/api/v1/feedback/$id", body(entryDate = today.minusDays(1), subject = "Docs are outdated", type = "CONCERN", details = "Wiki lags reality."), token)
            .expectStatus().isOk
            .expectHeader().valueEquals("ETag", "\"2\"")
            .expectBody()
            .jsonPath("$.subject").isEqualTo("Docs are outdated")
            .jsonPath("$.entryDate").isEqualTo(today.minusDays(1).toString())
            .jsonPath("$.type").isEqualTo("CONCERN")
            .jsonPath("$.details").isEqualTo("Wiki lags reality.")
            .jsonPath("$.version").isEqualTo(2)

        delete("/api/v1/feedback/$id", token).expectStatus().isNoContent
        get("/api/v1/feedback/$id", token).expectError(404, "NOT_FOUND")
        delete("/api/v1/feedback/$id", token).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `list is paginated with default sort entryDate desc`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        for (i in 0 until 5) create(token, entryDate = today.minusDays(i.toLong()), subject = "f$i")

        get("/api/v1/feedback?size=2", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(5)
            .jsonPath("$.totalPages").isEqualTo(3)
            .jsonPath("$.items.length()").isEqualTo(2)
            .jsonPath("$.items[0].subject").isEqualTo("f0")
            .jsonPath("$.items[1].subject").isEqualTo("f1")
        get("/api/v1/feedback?size=2&page=2", token)
            .expectStatus().isOk.expectBody().jsonPath("$.items.length()").isEqualTo(1).jsonPath("$.items[0].subject").isEqualTo("f4")
        get("/api/v1/feedback?sort=nope,asc", token).expectError(400, "VALIDATION_FAILED")
    }

    @Test
    fun `stale If-Match is 409 CONFLICT`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/feedback/$id", body(subject = "first"), token, ifMatch = "\"1\"").expectStatus().isOk
        put("/api/v1/feedback/$id", body(subject = "second"), token, ifMatch = "\"1\"").expectError(409, "CONFLICT")
        assertEquals("first", feedbackRepository.findById(id)!!.subject)
        put("/api/v1/feedback/$id", body(subject = "second"), token, ifMatch = "W/\"2\"").expectStatus().isOk.expectHeader().valueEquals("ETag", "\"3\"")
    }

    // ---- filters ----------------------------------------------------------

    @Test
    fun `type and date filters combine`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        create(token, type = "POSITIVE")
        create(token, type = "SUGGESTION")
        create(token, type = "CONCERN", entryDate = today.minusDays(10))
        create(token, type = "CONCERN")

        get("/api/v1/feedback", token).expectTotal(4)
        get("/api/v1/feedback?type=CONCERN", token).expectTotal(2)
        get("/api/v1/feedback?type=SUGGESTION", token).expectTotal(1)
        get("/api/v1/feedback?type=CONCERN&from=${today.minusDays(1)}", token).expectTotal(1)
        get("/api/v1/feedback?from=${today.minusDays(11)}&to=${today.minusDays(9)}", token).expectTotal(1)
        get("/api/v1/feedback?type=NOPE", token).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/feedback?from=2025-13-01", token).expectError(400, "VALIDATION_FAILED")
    }

    // ---- validation -------------------------------------------------------

    @Test
    fun `validation rejects missing blank too-long and future values`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/feedback", mapOf<String, Any?>(), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'entryDate')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'subject')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'type')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'details')].code").isEqualTo("REQUIRED")
        post("/api/v1/feedback", body(subject = "   ", details = " "), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'subject')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'details')].code").isEqualTo("REQUIRED")
        post("/api/v1/feedback", body(subject = "x".repeat(201)), token)
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[?(@.field == 'subject')].code").isEqualTo("TOO_LONG")
        post("/api/v1/feedback", body(details = "x".repeat(4001)), token)
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[?(@.field == 'details')].code").isEqualTo("TOO_LONG")
        post("/api/v1/feedback", body(type = "NEGATIVE"), token).expectError(400, "VALIDATION_FAILED")
        post("/api/v1/feedback", body(entryDate = today.plusDays(2)), token)
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[?(@.field == 'entryDate')]").exists()
        post("/api/v1/feedback", body(subject = "x".repeat(200), details = "y".repeat(4000)), token).expectStatus().isCreated
    }

    // ---- visibility matrix (D3, US-09) --------------------------------------

    @Test
    fun `visibility matrix over assigned, previously assigned and never assigned managers plus admin, reassignment flips access`() {
        val recruit = active(Role.NEW_RECRUIT)
        val first = active(Role.MANAGER)
        val second = active(Role.MANAGER)
        val never = active(Role.MANAGER)
        val recruitToken = login(recruit.email)
        val firstToken = login(first.email)
        val secondToken = login(second.email)
        val neverToken = login(never.email)
        val admin = adminToken()
        val id = create(recruitToken, type = "CONCERN")

        // no assignment yet: every manager is denied, list 403 / detail 404
        for (t in listOf(firstToken, secondToken, neverToken)) {
            get("/api/v1/feedback?recruitId=${recruit.id}", t).expectError(403, "NOT_ASSIGNED")
            get("/api/v1/feedback/$id", t).expectError(404, "NOT_FOUND")
        }
        get("/api/v1/feedback", firstToken).expectError(400, "VALIDATION_FAILED")

        // first manager assigned: reads, including type filter; cannot write
        assign(recruit.id, first.id)
        get("/api/v1/feedback?recruitId=${recruit.id}", firstToken).expectTotal(1)
        get("/api/v1/feedback?recruitId=${recruit.id}&type=CONCERN", firstToken).expectTotal(1)
        get("/api/v1/feedback?recruitId=${recruit.id}&type=POSITIVE", firstToken).expectTotal(0)
        get("/api/v1/feedback/$id", firstToken).expectStatus().isOk.expectBody().jsonPath("$.id").isEqualTo(id.toString())
        post("/api/v1/feedback", body(), firstToken).expectError(403, "FORBIDDEN")
        put("/api/v1/feedback/$id", body(), firstToken).expectError(403, "FORBIDDEN")
        delete("/api/v1/feedback/$id", firstToken).expectError(403, "FORBIDDEN")
        get("/api/v1/feedback?recruitId=${recruit.id}", secondToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/feedback/$id", secondToken).expectError(404, "NOT_FOUND")

        // reassignment: old manager loses access immediately, new one gains it (same tokens, no re-login)
        assign(recruit.id, second.id)
        get("/api/v1/feedback?recruitId=${recruit.id}", firstToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/feedback/$id", firstToken).expectError(404, "NOT_FOUND")
        get("/api/v1/feedback?recruitId=${recruit.id}", secondToken).expectTotal(1)
        get("/api/v1/feedback/$id", secondToken).expectStatus().isOk
        get("/api/v1/feedback?recruitId=${recruit.id}", neverToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/feedback/$id", neverToken).expectError(404, "NOT_FOUND")

        // admin reads everything regardless of assignment, may delete, may not author
        get("/api/v1/feedback?recruitId=${recruit.id}", admin).expectTotal(1)
        get("/api/v1/feedback/$id", admin).expectStatus().isOk
        post("/api/v1/feedback", body(), admin).expectError(403, "FORBIDDEN")
        put("/api/v1/feedback/$id", body(), admin).expectError(403, "FORBIDDEN")

        // the owner is unaffected by any of this
        get("/api/v1/feedback", recruitToken).expectTotal(1)
        get("/api/v1/feedback/$id", recruitToken).expectStatus().isOk

        delete("/api/v1/feedback/$id", admin).expectStatus().isNoContent
        get("/api/v1/feedback/$id", recruitToken).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `foreign note ids are 404 for recruits on GET PUT and DELETE and a recruit cannot list another recruit`() {
        val owner = login(active(Role.NEW_RECRUIT).email)
        val otherRecruit = active(Role.NEW_RECRUIT)
        val other = login(otherRecruit.email)
        val id = create(owner)

        get("/api/v1/feedback/$id", other).expectError(404, "NOT_FOUND")
        put("/api/v1/feedback/$id", body(), other).expectError(404, "NOT_FOUND")
        delete("/api/v1/feedback/$id", other).expectError(404, "NOT_FOUND")
        get("/api/v1/feedback/${UUID.randomUUID()}", owner).expectError(404, "NOT_FOUND")
        get("/api/v1/feedback", other).expectTotal(0)
        get("/api/v1/feedback?recruitId=${otherRecruit.id}", owner).expectError(403, "FORBIDDEN")
        get("/api/v1/feedback", null).expectError(401, "UNAUTHENTICATED")
    }
}
