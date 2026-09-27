package com.onboardingdiary

import com.onboardingdiary.task.TaskCategory
import com.onboardingdiary.task.TaskPriority
import com.onboardingdiary.task.TaskRepository
import com.onboardingdiary.task.TaskStatus
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
class TaskIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var taskRepository: TaskRepository

    private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)

    private fun body(
        entryDate: LocalDate = today,
        title: String? = "Read the handbook",
        category: String? = "TRAINING",
        status: String? = null,
        priority: String? = null,
        description: String? = null,
    ) = buildMap<String, Any?> {
        put("entryDate", entryDate.toString())
        put("title", title)
        put("category", category)
        if (status != null) put("status", status)
        if (priority != null) put("priority", priority)
        if (description != null) put("description", description)
    }

    private fun create(token: String, vararg overrides: Pair<String, Any?>): UUID =
        post("/api/v1/tasks", body() + overrides.toMap(), token).expectStatus().isCreated.json().jsonId()

    private fun createTask(token: String, entryDate: LocalDate, category: String, status: String, title: String = "t"): UUID =
        post("/api/v1/tasks", body(entryDate = entryDate, title = title, category = category, status = status), token)
            .expectStatus().isCreated.json().jsonId()

    private fun assign(recruitId: UUID, managerId: UUID) =
        post("/api/v1/assignments", mapOf("recruitId" to recruitId, "managerId" to managerId), adminToken()).expectStatus().isCreated

    private fun ResponseSpec.expectTotal(n: Int) = expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(n)

    // ---- CRUD -------------------------------------------------------------

    @Test
    fun `create defaults status TODO and priority MEDIUM and returns 201`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        post("/api/v1/tasks", body(description = "  "), token)
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.id").isNotEmpty
            .jsonPath("$.recruitId").isEqualTo(recruit.id.toString())
            .jsonPath("$.entryDate").isEqualTo(today.toString())
            .jsonPath("$.title").isEqualTo("Read the handbook")
            .jsonPath("$.description").isEqualTo(null)
            .jsonPath("$.category").isEqualTo("TRAINING")
            .jsonPath("$.status").isEqualTo("TODO")
            .jsonPath("$.priority").isEqualTo("MEDIUM")
            .jsonPath("$.createdAt").isNotEmpty
            .jsonPath("$.updatedAt").isNotEmpty
    }

    @Test
    fun `get update and delete own task, deleted task is 404 afterwards`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token, "priority" to "HIGH")

        get("/api/v1/tasks/$id", token).expectStatus().isOk.expectBody().jsonPath("$.priority").isEqualTo("HIGH")

        put(
            "/api/v1/tasks/$id",
            body(entryDate = today.minusDays(1), title = "Read the handbook (ch. 2)", category = "DOCUMENTATION", status = "IN_PROGRESS", priority = "LOW", description = "half way"),
            token,
        ).expectStatus().isOk
            .expectBody()
            .jsonPath("$.title").isEqualTo("Read the handbook (ch. 2)")
            .jsonPath("$.entryDate").isEqualTo(today.minusDays(1).toString())
            .jsonPath("$.category").isEqualTo("DOCUMENTATION")
            .jsonPath("$.status").isEqualTo("IN_PROGRESS")
            .jsonPath("$.priority").isEqualTo("LOW")
            .jsonPath("$.description").isEqualTo("half way")

        delete("/api/v1/tasks/$id", token).expectStatus().isNoContent
        get("/api/v1/tasks/$id", token).expectError(404, "NOT_FOUND")
        delete("/api/v1/tasks/$id", token).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `list is paginated with correct totals and default sort entryDate desc`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        for (i in 0 until 5) createTask(token, today.minusDays(i.toLong()), "OTHER", "TODO", title = "t$i")

        get("/api/v1/tasks?size=2", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(5)
            .jsonPath("$.totalPages").isEqualTo(3)
            .jsonPath("$.page").isEqualTo(0)
            .jsonPath("$.size").isEqualTo(2)
            .jsonPath("$.items.length()").isEqualTo(2)
            .jsonPath("$.items[0].title").isEqualTo("t0")
            .jsonPath("$.items[1].title").isEqualTo("t1")
        get("/api/v1/tasks?size=2&page=2", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.items.length()").isEqualTo(1)
            .jsonPath("$.items[0].title").isEqualTo("t4")
        get("/api/v1/tasks?sort=entryDate,asc&size=1", token)
            .expectStatus().isOk.expectBody().jsonPath("$.items[0].title").isEqualTo("t4")
        get("/api/v1/tasks?sort=nope,asc", token).expectError(400, "VALIDATION_FAILED")
    }

    // ---- filters ----------------------------------------------------------

    @Test
    fun `each filter and their combination narrow the list`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        createTask(token, today, "TRAINING", "TODO")
        createTask(token, today.minusDays(3), "TRAINING", "IN_PROGRESS")
        createTask(token, today.minusDays(10), "SETUP", "IN_PROGRESS")
        createTask(token, today.minusDays(20), "MEETING", "DONE")

        get("/api/v1/tasks", token).expectTotal(4)
        get("/api/v1/tasks?from=${today.minusDays(5)}", token).expectTotal(2)
        get("/api/v1/tasks?to=${today.minusDays(5)}", token).expectTotal(2)
        get("/api/v1/tasks?from=${today.minusDays(10)}&to=${today.minusDays(3)}", token).expectTotal(2)
        get("/api/v1/tasks?category=TRAINING", token).expectTotal(2)
        get("/api/v1/tasks?status=IN_PROGRESS", token).expectTotal(2)
        get("/api/v1/tasks?status=IN_PROGRESS&category=TRAINING", token).expectTotal(1)
        get("/api/v1/tasks?status=IN_PROGRESS&category=TRAINING&from=${today.minusDays(2)}", token).expectTotal(0)
        get("/api/v1/tasks?status=IN_PROGRESS&from=${today.minusDays(30)}&to=${today.minusDays(4)}", token).expectTotal(1)
    }

    @Test
    fun `invalid filters are 400 with field details`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        get("/api/v1/tasks?status=WAITING", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("status")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_ENUM")
        get("/api/v1/tasks?category=training", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("category")
        get("/api/v1/tasks?from=2026-13-01", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("from")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_FORMAT")
        get("/api/v1/tasks?from=2026-02-01&to=2026-01-01", token).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
    }

    // ---- validation -------------------------------------------------------

    @Test
    fun `validation failures are 400 with one detail per field`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/tasks", mapOf("title" to " ", "description" to "x".repeat(4001)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'entryDate')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'title')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'category')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'description')].code").isEqualTo("TOO_LONG")
        post("/api/v1/tasks", body(title = "x".repeat(201)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("title")
            .jsonPath("$.details[0].code").isEqualTo("TOO_LONG")
        post("/api/v1/tasks", body(category = "GYM"), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("category")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_ENUM")
        post("/api/v1/tasks", body() + ("entryDate" to "yesterday"), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("entryDate")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_FORMAT")
    }

    @Test
    fun `entry date more than one day in the future is 400 (INV-09)`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        post("/api/v1/tasks", body(entryDate = today.plusDays(1)), token).expectStatus().isCreated
        post("/api/v1/tasks", body(entryDate = today.plusDays(2)), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("entryDate")
            .jsonPath("$.details[0].code").isEqualTo("OUT_OF_RANGE")
        val id = create(token)
        put("/api/v1/tasks/$id", body(entryDate = today.plusDays(2), status = "TODO", priority = "MEDIUM"), token)
            .expectError(400, "VALIDATION_FAILED")
    }

    @Test
    fun `update requires status and priority and an allowed transition`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/tasks/$id", body(), token)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'status')].code").isEqualTo("REQUIRED")
            .jsonPath("$.details[?(@.field == 'priority')].code").isEqualTo("REQUIRED")

        put("/api/v1/tasks/$id", body(status = "BLOCKED", priority = "MEDIUM"), token)
            .expectError(422, "INVALID_STATE_TRANSITION")
            .jsonPath("$.details[0].field").isEqualTo("status")
            .jsonPath("$.details[0].code").isEqualTo("INVALID_TRANSITION")
        get("/api/v1/tasks/$id", token).expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("TODO")

        put("/api/v1/tasks/$id", body(status = "IN_PROGRESS", priority = "MEDIUM"), token).expectStatus().isOk
        put("/api/v1/tasks/$id", body(status = "BLOCKED", priority = "MEDIUM"), token).expectStatus().isOk
        put("/api/v1/tasks/$id", body(status = "DONE", priority = "MEDIUM"), token).expectError(422, "INVALID_STATE_TRANSITION")
        put("/api/v1/tasks/$id", body(status = "BLOCKED", priority = "HIGH"), token)
            .expectStatus().isOk.expectBody().jsonPath("$.priority").isEqualTo("HIGH")
    }

    @Test
    fun `update is a compare-and-set on the row version, so a concurrent edit cannot bypass the state machine`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        // Another request moves the task to DONE (version 1 -> 2) after this one read version 1.
        put("/api/v1/tasks/$id", body(status = "DONE", priority = "MEDIUM"), token).expectStatus().isOk

        val applied = taskRepository.update(
            id = id,
            entryDate = today,
            title = "stale",
            description = null,
            category = TaskCategory.TRAINING,
            status = TaskStatus.BLOCKED,
            priority = TaskPriority.MEDIUM,
            expectedVersion = 1,
        )

        assertFalse(applied)
        val latest = taskRepository.findById(id)!!
        assertEquals(TaskStatus.DONE, latest.status)
        assertEquals(2, latest.version)
    }

    @Test
    fun `responses carry version and ETag, and each update bumps them`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        get("/api/v1/tasks/$id", token).expectStatus().isOk
            .expectHeader().valueEquals("ETag", "\"1\"")
            .expectBody().jsonPath("$.version").isEqualTo(1)
        put("/api/v1/tasks/$id", body(title = "edited", status = "TODO", priority = "LOW"), token).expectStatus().isOk
            .expectHeader().valueEquals("ETag", "\"2\"")
            .expectBody().jsonPath("$.version").isEqualTo(2)
    }

    @Test
    fun `stale If-Match is 409 CONFLICT even when both edits keep the same status`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        // Two editors both loaded version 1 and keep status TODO.
        put("/api/v1/tasks/$id", body(title = "first editor", status = "TODO", priority = "LOW"), token, ifMatch = "\"1\"")
            .expectStatus().isOk
        put("/api/v1/tasks/$id", body(title = "second editor", status = "TODO", priority = "HIGH"), token, ifMatch = "\"1\"")
            .expectError(409, "CONFLICT")

        val latest = taskRepository.findById(id)!!
        assertEquals("first editor", latest.title)
        assertEquals(TaskPriority.LOW, latest.priority)
        assertEquals(2, latest.version)

        // Fresh ETag (weak form accepted) succeeds.
        put("/api/v1/tasks/$id", body(title = "second editor", status = "TODO", priority = "HIGH"), token, ifMatch = "W/\"2\"")
            .expectStatus().isOk.expectBody().jsonPath("$.version").isEqualTo(3)
    }

    @Test
    fun `malformed If-Match is 400 with a field detail`() {
        val token = login(active(Role.NEW_RECRUIT).email)
        val id = create(token)
        put("/api/v1/tasks/$id", body(status = "TODO", priority = "LOW"), token, ifMatch = "abc")
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("If-Match")
    }

    // ---- ownership & roles -------------------------------------------------

    @Test
    fun `foreign task ids are 404 for recruits on GET PUT and DELETE`() {
        val owner = login(active(Role.NEW_RECRUIT).email)
        val other = login(active(Role.NEW_RECRUIT).email)
        val id = create(owner)

        get("/api/v1/tasks/$id", other).expectError(404, "NOT_FOUND")
        put("/api/v1/tasks/$id", body(status = "TODO", priority = "LOW"), other).expectError(404, "NOT_FOUND")
        delete("/api/v1/tasks/$id", other).expectError(404, "NOT_FOUND")
        get("/api/v1/tasks/${UUID.randomUUID()}", owner).expectError(404, "NOT_FOUND")
        get("/api/v1/tasks/$id", owner).expectStatus().isOk
        get("/api/v1/tasks", other).expectTotal(0)
    }

    @Test
    fun `recruit passing a foreign recruitId is 403 and self recruitId is allowed`() {
        val recruit = active(Role.NEW_RECRUIT)
        val token = login(recruit.email)
        create(token)
        get("/api/v1/tasks?recruitId=${recruit.id}", token).expectTotal(1)
        get("/api/v1/tasks?recruitId=${UUID.randomUUID()}", token).expectError(403, "FORBIDDEN")
    }

    @Test
    fun `manager access follows the live assignment and is read-only`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val otherManager = active(Role.MANAGER)
        val recruitToken = login(recruit.email)
        val managerToken = login(manager.email)
        val id = create(recruitToken)

        get("/api/v1/tasks", managerToken).expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("recruitId")
        get("/api/v1/tasks?recruitId=${recruit.id}", managerToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/tasks/$id", managerToken).expectError(404, "NOT_FOUND")

        assign(recruit.id, manager.id)
        get("/api/v1/tasks?recruitId=${recruit.id}", managerToken).expectTotal(1)
        get("/api/v1/tasks/$id", managerToken).expectStatus().isOk.expectBody().jsonPath("$.id").isEqualTo(id.toString())

        post("/api/v1/tasks", body(), managerToken).expectError(403, "FORBIDDEN")
        put("/api/v1/tasks/$id", body(status = "TODO", priority = "LOW"), managerToken).expectError(403, "FORBIDDEN")
        delete("/api/v1/tasks/$id", managerToken).expectError(403, "FORBIDDEN")

        assign(recruit.id, otherManager.id)
        get("/api/v1/tasks?recruitId=${recruit.id}", managerToken).expectError(403, "NOT_ASSIGNED")
        get("/api/v1/tasks/$id", managerToken).expectError(404, "NOT_FOUND")
        get("/api/v1/tasks?recruitId=${recruit.id}", login(otherManager.email)).expectTotal(1)
    }

    @Test
    fun `admin can read any recruit and delete but not create or update`() {
        val recruit = active(Role.NEW_RECRUIT)
        val recruitToken = login(recruit.email)
        val admin = adminToken()
        val id = create(recruitToken)

        get("/api/v1/tasks", admin).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/tasks?recruitId=${recruit.id}", admin).expectTotal(1)
        get("/api/v1/tasks?recruitId=${UUID.randomUUID()}", admin).expectError(404, "NOT_FOUND")
        get("/api/v1/tasks/$id", admin).expectStatus().isOk

        post("/api/v1/tasks", body(), admin).expectError(403, "FORBIDDEN")
        put("/api/v1/tasks/$id", body(status = "TODO", priority = "LOW"), admin).expectError(403, "FORBIDDEN")

        delete("/api/v1/tasks/$id", admin).expectStatus().isNoContent
        get("/api/v1/tasks/$id", recruitToken).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `tasks require authentication`() {
        get("/api/v1/tasks", null).expectError(401, "UNAUTHENTICATED")
        post("/api/v1/tasks", body(), null).expectError(401, "UNAUTHENTICATED")
    }
}
