package com.onboardingdiary

import com.onboardingdiary.user.Role
import org.junit.jupiter.api.Test
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.reactive.server.WebTestClient.ResponseSpec
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

@ActiveProfiles("dev")
class NoteIT : AbstractAuthenticatedIntegrationTest() {

    private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)

    private fun body(
        entryDate: LocalDate = today,
        title: String? = "Dev environment",
        content: String? = "Installed the JDK and IDE.",
        tags: List<String>? = listOf("setup"),
    ) = buildMap<String, Any?> {
        put("entryDate", entryDate.toString())
        put("title", title)
        put("content", content)
        if (tags != null) put("tags", tags)
    }

    private fun create(token: String, vararg overrides: Pair<String, Any?>): UUID =
        post("/api/v1/notes", body() + overrides.toMap(), token).expectStatus().isCreated.json().jsonId()

    private fun assign(recruitId: UUID, managerId: UUID) =
        post("/api/v1/assignments", mapOf("recruitId" to recruitId, "managerId" to managerId), adminToken()).expectStatus().isCreated

    private fun ResponseSpec.expectTotal(n: Int) = expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(n)

    // ---- CRUD -------------------------------------------------------------

    @Test
    fun `create normalizes tags and returns 201 with ETag`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        post("/api/v1/notes", body(tags = listOf("Kotlin", " setup ")), token)
            .expectStatus().isCreated
            .expectHeader().valueEquals("ETag", "\"1\"")
            .expectBody()
            .jsonPath("$.id").isNotEmpty
            .jsonPath("$.recruitId").isEqualTo(recruit.id.toString())
            .jsonPath("$.entryDate").isEqualTo(today.toString())
            .jsonPath("$.title").isEqualTo("Dev environment")
            .jsonPath("$.content").isEqualTo("Installed the JDK and IDE.")
            .jsonPath("$.tags").isEqualTo(listOf("kotlin", "setup"))
            .jsonPath("$.version").isEqualTo(1)
            .jsonPath("$.createdAt").isNotEmpty
            .jsonPath("$.updatedAt").isNotEmpty
    }

    @Test
    fun `tags default to empty when omitted`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/notes", body(tags = null), token)
            .expectStatus().isCreated
            .expectBody().jsonPath("$.tags").isEqualTo(emptyList<String>())
    }

    @Test
    fun `get update and delete own note, tags are persisted and replaced on update`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token, "tags" to listOf("kotlin", "setup"))

        get("/api/v1/notes/$id", token).expectStatus().isOk
            .expectBody().jsonPath("$.tags").isEqualTo(listOf("kotlin", "setup"))

        put("/api/v1/notes/$id", body(entryDate = today.minusDays(1), title = "Dev env (day 2)", content = "Configured Git.", tags = listOf("Git", "setup")), token)
            .expectStatus().isOk
            .expectHeader().valueEquals("ETag", "\"2\"")
            .expectBody()
            .jsonPath("$.title").isEqualTo("Dev env (day 2)")
            .jsonPath("$.entryDate").isEqualTo(today.minusDays(1).toString())
            .jsonPath("$.content").isEqualTo("Configured Git.")
            .jsonPath("$.tags").isEqualTo(listOf("git", "setup"))
            .jsonPath("$.version").isEqualTo(2)

        get("/api/v1/notes?tag=kotlin", token).expectTotal(0)
        get("/api/v1/notes?tag=git", token).expectTotal(1)

        put("/api/v1/notes/$id", body(tags = emptyList()), token).expectStatus().isOk
            .expectBody().jsonPath("$.tags").isEqualTo(emptyList<String>())

        delete("/api/v1/notes/$id", token).expectStatus().isNoContent
        get("/api/v1/notes/$id", token).expectError(404, "NOT_FOUND")
        delete("/api/v1/notes/$id", token).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `stale If-Match is 409 CONFLICT and malformed If-Match is 400`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/notes/$id", body(title = "v2"), token, ifMatch = "\"1\"").expectStatus().isOk
        put("/api/v1/notes/$id", body(title = "v3"), token, ifMatch = "\"1\"").expectError(409, "CONFLICT")
        put("/api/v1/notes/$id", body(title = "v3"), token, ifMatch = "abc").expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("If-Match")
    }

    // ---- filters ----------------------------------------------------------

    @Test
    fun `list is paginated, sorted entryDate desc and filterable by date range and exact tag`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        create(token, "entryDate" to today.toString(), "title" to "n0", "tags" to listOf("kotlin", "setup"))
        create(token, "entryDate" to today.minusDays(1).toString(), "title" to "n1", "tags" to listOf("kotlin-coroutines"))
        create(token, "entryDate" to today.minusDays(2).toString(), "title" to "n2", "tags" to listOf("setup"))
        create(token, "entryDate" to today.minusDays(3).toString(), "title" to "n3", "tags" to emptyList<String>())

        get("/api/v1/notes?size=2", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(4)
            .jsonPath("$.totalPages").isEqualTo(2)
            .jsonPath("$.items.length()").isEqualTo(2)
            .jsonPath("$.items[0].title").isEqualTo("n0")
            .jsonPath("$.items[1].title").isEqualTo("n1")

        get("/api/v1/notes?tag=kotlin", token).expectTotal(1).jsonPath("$.items[0].title").isEqualTo("n0")
        get("/api/v1/notes?tag=Setup", token).expectTotal(2)
        get("/api/v1/notes?tag=kotlin-coroutines", token).expectTotal(1)
        get("/api/v1/notes?tag=kot", token).expectTotal(0)
        get("/api/v1/notes?tag=", token).expectTotal(4)
        get("/api/v1/notes?from=${today.minusDays(2)}&to=${today.minusDays(1)}", token).expectTotal(2)
        get("/api/v1/notes?from=${today.minusDays(2)}&tag=setup", token).expectTotal(2)
        get("/api/v1/notes?to=${today.minusDays(1)}&tag=setup", token).expectTotal(1).jsonPath("$.items[0].title").isEqualTo("n2")
    }

    @Test
    fun `invalid filters are 400 with field details`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        get("/api/v1/notes?tag=bad%20tag", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("tag")
        get("/api/v1/notes?from=2024-13-01", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("from")
        get("/api/v1/notes?sort=content,asc", token).expectError(400, "VALIDATION_FAILED")
    }

    // ---- validation -------------------------------------------------------

    @Test
    fun `eleventh tag and tag with spaces are 400 VALIDATION_FAILED on tags (US-10)`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/notes", body(tags = (1..11).map { "t$it" }), token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("tags")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
        post("/api/v1/notes", body(tags = listOf("ok", "not ok")), token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("tags[1]")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_FORMAT")
        post("/api/v1/notes", body(tags = listOf("-dash", "Ünïcode")), token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details.length()").isEqualTo(2)

        val id = create(token)
        put("/api/v1/notes/$id", body(tags = (1..11).map { "t$it" }), token).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/notes/$id", token).expectStatus().isOk.expectBody().jsonPath("$.tags").isEqualTo(listOf("setup"))
    }

    @Test
    fun `missing and oversized fields are 400 with one detail per field`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/notes", mapOf("title" to " ", "content" to "x".repeat(10001)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'entryDate')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'title')]").exists()
            .jsonPath("$.details[?(@.field == 'content')].code").isEqualTo("TOO_LONG")
        post("/api/v1/notes", body(entryDate = today.plusDays(2)), token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("entryDate")
        post("/api/v1/notes", body() + ("extra" to 1), token).expectError(400, "VALIDATION_FAILED")
    }

    // ---- scoping ----------------------------------------------------------

    @Test
    fun `foreign note ids are 404 for recruits on GET PUT and DELETE`() {
        val owner = login(active(Role.NEW_RECRUIT).email)
        val other = login(active(Role.NEW_RECRUIT).email)
        val id = create(owner)
        get("/api/v1/notes/$id", other).expectError(404, "NOT_FOUND")
        put("/api/v1/notes/$id", body(), other).expectError(404, "NOT_FOUND")
        delete("/api/v1/notes/$id", other).expectError(404, "NOT_FOUND")
        get("/api/v1/notes", other).expectTotal(0)
        get("/api/v1/notes/$id", owner).expectStatus().isOk
    }

    @Test
    fun `recruit passing a foreign recruitId is 403 and self recruitId is allowed`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        create(token)
        get("/api/v1/notes?recruitId=${recruit.id}", token).expectTotal(1)
        get("/api/v1/notes?recruitId=${UUID.randomUUID()}", token).expectError(403, "FORBIDDEN")
    }

    @Test
    fun `manager access follows the live assignment and is read-only`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val otherManager = active(Role.MANAGER)
        val recruitToken = login(recruit.email)
        val managerToken = login(manager.email)
        val id = create(recruitToken)

        get("/api/v1/notes", managerToken).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("recruitId")
        get("/api/v1/notes?recruitId=${recruit.id}", managerToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/notes/$id", managerToken).expectError(404, "NOT_FOUND")

        assign(recruit.id, manager.id)
        get("/api/v1/notes?recruitId=${recruit.id}&tag=setup", managerToken).expectTotal(1)
        get("/api/v1/notes/$id", managerToken).expectStatus().isOk.expectBody().jsonPath("$.id").isEqualTo(id.toString())

        post("/api/v1/notes", body(), managerToken).expectError(403, "FORBIDDEN")
        put("/api/v1/notes/$id", body(), managerToken).expectError(403, "FORBIDDEN")
        delete("/api/v1/notes/$id", managerToken).expectError(403, "FORBIDDEN")

        assign(recruit.id, otherManager.id)
        get("/api/v1/notes?recruitId=${recruit.id}", managerToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/notes/$id", managerToken).expectError(404, "NOT_FOUND")
        get("/api/v1/notes?recruitId=${recruit.id}", login(otherManager.email)).expectTotal(1)
    }

    @Test
    fun `admin can read any recruit and delete but not create or update`() {
        val recruit = active(Role.NEW_RECRUIT)
        val recruitToken = login(recruit.email)
        val admin = adminToken()
        val id = create(recruitToken)

        get("/api/v1/notes", admin).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/notes?recruitId=${recruit.id}", admin).expectTotal(1)
        get("/api/v1/notes?recruitId=${UUID.randomUUID()}", admin).expectError(404, "NOT_FOUND")
        get("/api/v1/notes/$id", admin).expectStatus().isOk

        post("/api/v1/notes", body(), admin).expectError(403, "FORBIDDEN")
        put("/api/v1/notes/$id", body(), admin).expectError(403, "FORBIDDEN")

        delete("/api/v1/notes/$id", admin).expectStatus().isNoContent
        get("/api/v1/notes/$id", recruitToken).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `notes require authentication`() {
        get("/api/v1/notes", null).expectError(401, "UNAUTHENTICATED")
        post("/api/v1/notes", body(), null).expectError(401, "UNAUTHENTICATED")
    }
}
