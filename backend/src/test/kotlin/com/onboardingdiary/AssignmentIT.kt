package com.onboardingdiary

import com.onboardingdiary.assignment.AssignmentGuard
import com.onboardingdiary.assignment.AssignmentStatus
import com.onboardingdiary.user.Role
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.RepeatedTest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.awaitBodyOrNull
import org.springframework.web.reactive.function.client.awaitExchange
import java.util.UUID

@ActiveProfiles("dev")
class AssignmentIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var guard: AssignmentGuard

    private fun assign(recruitId: UUID, managerId: UUID, token: String, note: String? = null) =
        post("/api/v1/assignments", buildMap { put("recruitId", recruitId); put("managerId", managerId); if (note != null) put("note", note) }, token)

    private fun activeRows(recruitId: UUID): Int =
        jdbc.queryForObject("SELECT count(*) FROM assignments WHERE recruit_id = ? AND status = 'ACTIVE'", Int::class.java, recruitId)!!

    // ---- authorization ----------------------------------------------------

    @Test
    fun `assignments endpoints are admin only and me endpoints are role scoped`() {
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        val recruitToken = login(recruit.email)
        val managerToken = login(manager.email)
        val admin = adminToken()

        get("/api/v1/assignments", null).expectError(401, "UNAUTHENTICATED")
        for (t in listOf(recruitToken, managerToken)) {
            get("/api/v1/assignments", t).expectError(403, "FORBIDDEN")
            assign(recruit.id, manager.id, t).expectError(403, "FORBIDDEN")
        }
        get("/api/v1/me/recruits", recruitToken).expectError(403, "FORBIDDEN")
        get("/api/v1/me/recruits", admin).expectError(403, "FORBIDDEN")
        get("/api/v1/me/manager", managerToken).expectError(403, "FORBIDDEN")
        get("/api/v1/me/manager", admin).expectError(403, "FORBIDDEN")
        assertEquals(0, activeRows(recruit.id))
    }

    // ---- assign / reassign -------------------------------------------------

    @Test
    fun `assign creates an ACTIVE assignment visible to admin detail, manager recruits and recruit manager`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT, fullName = "Jane Recruit")
        val manager = active(Role.MANAGER, fullName = "Mark Manager")

        get("/api/v1/me/manager", login(recruit.email)).expectStatus().isOk.expectBody().jsonPath("$.assignment").isEqualTo(null)

        assign(recruit.id, manager.id, admin, note = "first team")
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.assignment.status").isEqualTo("ACTIVE")
            .jsonPath("$.assignment.recruit.id").isEqualTo(recruit.id.toString())
            .jsonPath("$.assignment.manager.id").isEqualTo(manager.id.toString())
            .jsonPath("$.assignment.assignedBy.email").isEqualTo(ADMIN_EMAIL)
            .jsonPath("$.assignment.note").isEqualTo("first team")
            .jsonPath("$.assignment.endedAt").isEqualTo(null)
            .jsonPath("$.assignment.recruit.passwordHash").doesNotExist()
            .jsonPath("$.superseded").isEqualTo(null)

        get("/api/v1/users/${recruit.id}", admin).expectStatus().isOk
            .expectBody().jsonPath("$.currentAssignment.manager.id").isEqualTo(manager.id.toString())
        get("/api/v1/users/${manager.id}", admin).expectStatus().isOk
            .expectBody().jsonPath("$.activeRecruitCount").isEqualTo(1)

        get("/api/v1/me/recruits", login(manager.email)).expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(1)
            .jsonPath("$.items[0].recruit.id").isEqualTo(recruit.id.toString())
            .jsonPath("$.items[0].assignedAt").isNotEmpty
            .jsonPath("$.items[0].openIssueCount").isEqualTo(0)

        get("/api/v1/me/manager", login(recruit.email)).expectStatus().isOk
            .expectBody().jsonPath("$.assignment.manager.fullName").isEqualTo("Mark Manager")

        assertTrue(runBlocking { guard.isActivelyAssigned(manager.id, recruit.id) })
        assertFalse(runBlocking { guard.isActivelyAssigned(recruit.id, manager.id) })
    }

    @Test
    fun `reassign supersedes the previous assignment atomically and me recruits reflects it immediately`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val m1 = active(Role.MANAGER)
        val m2 = active(Role.MANAGER)
        val m1Token = login(m1.email)
        val m2Token = login(m2.email)

        val first = assign(recruit.id, m1.id, admin).expectStatus().isCreated.json().jsonId()
        get("/api/v1/me/recruits", m1Token).expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(1)

        assign(recruit.id, m2.id, admin)
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.assignment.status").isEqualTo("ACTIVE")
            .jsonPath("$.assignment.manager.id").isEqualTo(m2.id.toString())
            .jsonPath("$.superseded.id").isEqualTo(first.toString())
            .jsonPath("$.superseded.status").isEqualTo("REASSIGNED")
            .jsonPath("$.superseded.endedAt").isNotEmpty

        assertEquals(1, activeRows(recruit.id))
        get("/api/v1/me/recruits", m1Token).expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(0)
        get("/api/v1/me/recruits", m2Token).expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(1)
        assertFalse(runBlocking { guard.isActivelyAssigned(m1.id, recruit.id) })
        assertTrue(runBlocking { guard.isActivelyAssigned(m2.id, recruit.id) })

        // history newest first
        get("/api/v1/users/${recruit.id}/assignments", admin)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(2)
            .jsonPath("$.items[0].status").isEqualTo("ACTIVE")
            .jsonPath("$.items[0].manager.id").isEqualTo(m2.id.toString())
            .jsonPath("$.items[1].status").isEqualTo("REASSIGNED")
            .jsonPath("$.items[1].manager.id").isEqualTo(m1.id.toString())

        // re-assigning back to m1 after being superseded is allowed
        assign(recruit.id, m1.id, admin).expectStatus().isCreated
        assertEquals(1, activeRows(recruit.id))
    }

    @Test
    fun `same active manager is 409 ASSIGNMENT_UNCHANGED`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        assign(recruit.id, manager.id, admin).expectStatus().isCreated
        assign(recruit.id, manager.id, admin).expectError(409, "ASSIGNMENT_UNCHANGED")
        assertEquals(1, activeRows(recruit.id))
    }

    @Test
    fun `invalid parties are 422 INVALID_ASSIGNMENT_PARTY and unknown ids 404`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)

        assign(recruit.id, active(Role.NEW_RECRUIT).id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY").jsonPath("$.details[0].field").isEqualTo("managerId")
        assign(recruit.id, adminId(), admin).expectError(422, "INVALID_ASSIGNMENT_PARTY")
        assign(recruit.id, deactivated(Role.MANAGER).id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY")
        assign(recruit.id, invited(Role.MANAGER).id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY")
        assign(manager.id, manager.id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY")
        assign(active(Role.MANAGER).id, manager.id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY").jsonPath("$.details[0].field").isEqualTo("recruitId")
        assign(invited(Role.NEW_RECRUIT).id, manager.id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY")
        assign(deactivated(Role.NEW_RECRUIT).id, manager.id, admin).expectError(422, "INVALID_ASSIGNMENT_PARTY")

        assign(UUID.randomUUID(), manager.id, admin).expectError(404, "NOT_FOUND")
        assign(recruit.id, UUID.randomUUID(), admin).expectError(404, "NOT_FOUND")
        post("/api/v1/assignments", mapOf("recruitId" to recruit.id), admin)
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("managerId")
        post("/api/v1/assignments", mapOf("recruitId" to recruit.id, "managerId" to manager.id, "note" to "x".repeat(501)), admin)
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("note")
        assertEquals(0, activeRows(recruit.id))
    }

    @RepeatedTest(3)
    fun `two concurrent reassignments leave exactly one ACTIVE row and one 409 CONFLICT`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val m0 = active(Role.MANAGER)
        val m1 = active(Role.MANAGER)
        val m2 = active(Role.MANAGER)
        assign(recruit.id, m0.id, admin).expectStatus().isCreated

        val port = client.get().uri("/health").exchange().returnResult(String::class.java).url.port
        val web = WebClient.create("http://localhost:$port")
        val statuses = runBlocking {
            coroutineScope {
                listOf(m1, m2).map { m ->
                    async {
                        web.post().uri("/api/v1/assignments")
                            .header("Authorization", "Bearer $admin")
                            .bodyValue(mapOf("recruitId" to recruit.id, "managerId" to m.id))
                            .awaitExchange { it.statusCode().value() to (it.awaitBodyOrNull<String>() ?: "") }
                    }
                }.awaitAll()
            }
        }
        val codes = statuses.map { it.first }.sorted()
        val totalRows = jdbc.queryForObject("SELECT count(*) FROM assignments WHERE recruit_id = ?", Int::class.java, recruit.id)!!
        assertEquals(1, activeRows(recruit.id), "exactly one ACTIVE row after concurrent reassignment")
        // Either both raced to end m0 (one 201 + one 409 CONFLICT, loser rolled back), or they serialised (two 201s).
        if (codes == listOf(201, 409)) {
            assertTrue(statuses.first { it.first == 409 }.second.contains("\"CONFLICT\""), statuses.toString())
            assertEquals(2, totalRows, "the loser must not have inserted a row")
        } else {
            assertEquals(listOf(201, 201), codes, statuses.toString())
            assertEquals(3, totalRows)
        }
    }

    @Test
    fun `two concurrent first assignments hit the partial unique index and yield one 201 and one 409 CONFLICT`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val m1 = active(Role.MANAGER)
        val m2 = active(Role.MANAGER)

        val port = client.get().uri("/health").exchange().returnResult(String::class.java).url.port
        val web = WebClient.create("http://localhost:$port")
        val outcomes = runBlocking {
            (1..8).map { i ->
                coroutineScope {
                    val r = active(Role.NEW_RECRUIT)
                    listOf(m1, m2).map { m ->
                        async {
                            web.post().uri("/api/v1/assignments")
                                .header("Authorization", "Bearer $admin")
                                .bodyValue(mapOf("recruitId" to r.id, "managerId" to m.id))
                                .awaitExchange { it.statusCode().value() to (it.awaitBodyOrNull<String>() ?: "") }
                        }
                    }.awaitAll().also { assertEquals(1, activeRows(r.id)) }
                }
            }
        }
        // every round ends with exactly one ACTIVE row; at least one round must have produced the index conflict
        outcomes.forEach { round ->
            val codes = round.map { it.first }.sorted()
            assertTrue(codes == listOf(201, 409) || codes == listOf(201, 201), round.toString())
            round.filter { it.first == 409 }.forEach { assertTrue(it.second.contains("\"CONFLICT\""), it.second) }
        }
        assertEquals(0, activeRows(recruit.id))
    }

    // ---- listing ------------------------------------------------------------

    @Test
    fun `GET assignments filters by recruit, manager and status with default assignedAt desc`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val m1 = active(Role.MANAGER)
        val m2 = active(Role.MANAGER)
        assign(recruit.id, m1.id, admin).expectStatus().isCreated
        assign(recruit.id, m2.id, admin).expectStatus().isCreated

        get("/api/v1/assignments?recruitId=${recruit.id}", admin)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(2)
            .jsonPath("$.totalPages").isEqualTo(1)
            .jsonPath("$.items[0].manager.id").isEqualTo(m2.id.toString())
            .jsonPath("$.items[1].manager.id").isEqualTo(m1.id.toString())
        get("/api/v1/assignments?recruitId=${recruit.id}&status=REASSIGNED", admin)
            .expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(1).jsonPath("$.items[0].manager.id").isEqualTo(m1.id.toString())
        get("/api/v1/assignments?managerId=${m2.id}&status=${AssignmentStatus.ACTIVE}", admin)
            .expectStatus().isOk.expectBody().jsonPath("$.totalItems").isEqualTo(1)
        get("/api/v1/assignments?recruitId=${recruit.id}&sort=assignedAt,asc", admin)
            .expectStatus().isOk.expectBody().jsonPath("$.items[0].manager.id").isEqualTo(m1.id.toString())
        get("/api/v1/assignments?sort=note,asc", admin).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/users/${UUID.randomUUID()}/assignments", admin).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `me recruits paginates and sorts by fullName by default`() {
        val admin = adminToken()
        val manager = active(Role.MANAGER)
        val a = active(Role.NEW_RECRUIT, fullName = "Aaron Zed")
        val b = active(Role.NEW_RECRUIT, fullName = "Bea Young")
        val c = active(Role.NEW_RECRUIT, fullName = "Cara Xu")
        listOf(c, a, b).forEach { assign(it.id, manager.id, admin).expectStatus().isCreated }

        val token = login(manager.email)
        get("/api/v1/me/recruits?size=2", token)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.totalItems").isEqualTo(3)
            .jsonPath("$.totalPages").isEqualTo(2)
            .jsonPath("$.items[0].recruit.fullName").isEqualTo("Aaron Zed")
            .jsonPath("$.items[1].recruit.fullName").isEqualTo("Bea Young")
        get("/api/v1/me/recruits?size=2&page=1&sort=fullName,asc", token)
            .expectStatus().isOk.expectBody().jsonPath("$.items[0].recruit.fullName").isEqualTo("Cara Xu")
        get("/api/v1/me/recruits?sort=assignedAt,desc", token)
            .expectStatus().isOk.expectBody().jsonPath("$.items[0].recruit.fullName").isEqualTo("Bea Young")
        get("/api/v1/me/recruits?sort=email,desc", token).expectStatus().isOk
        get("/api/v1/me/recruits?sort=note,asc", token).expectError(400, "VALIDATION_FAILED")
    }
}
