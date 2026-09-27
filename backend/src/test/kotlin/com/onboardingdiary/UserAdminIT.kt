package com.onboardingdiary

import com.onboardingdiary.assignment.AssignmentRepository
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import java.util.UUID

@ActiveProfiles("dev")
class UserAdminIT : AbstractAuthenticatedIntegrationTest() {

    @Autowired lateinit var jdbc: JdbcTemplate
    @Autowired lateinit var assignments: AssignmentRepository

    // ---- authorization ----------------------------------------------------

    @Test
    fun `users endpoints require a token`() {
        get("/api/v1/users", null).expectError(401, "UNAUTHENTICATED")
        post("/api/v1/users", mapOf("email" to unique("x"), "fullName" to "X", "role" to "MANAGER"), null).expectError(401, "UNAUTHENTICATED")
    }

    @Test
    fun `non-admins get 403 on every users endpoint`() {
        for (role in listOf(Role.NEW_RECRUIT, Role.MANAGER)) {
            val token = login(active(role).email)
            val target = active(Role.NEW_RECRUIT).id
            get("/api/v1/users", token).expectError(403, "FORBIDDEN")
            post("/api/v1/users", mapOf("email" to unique("x"), "fullName" to "X", "role" to "MANAGER"), token).expectError(403, "FORBIDDEN")
            get("/api/v1/users/$target", token).expectError(403, "FORBIDDEN")
            patch("/api/v1/users/$target", mapOf("fullName" to "Y"), token).expectError(403, "FORBIDDEN")
            post("/api/v1/users/$target/deactivate", null, token).expectError(403, "FORBIDDEN")
            post("/api/v1/users/$target/reactivate", null, token).expectError(403, "FORBIDDEN")
            get("/api/v1/users/$target/assignments", token).expectError(403, "FORBIDDEN")
        }
    }

    // ---- provisioning -----------------------------------------------------

    @Test
    fun `POST users creates an INVITED user without password, created by the admin`() {
        val admin = adminToken()
        val email = unique("new.hire")
        val body = post(
            "/api/v1/users",
            mapOf("email" to " ${email.uppercase()} ", "fullName" to "New Hire", "role" to "NEW_RECRUIT", "department" to "Payments", "startDate" to "2026-10-01"),
            admin,
        )
            .expectStatus().isCreated
            .expectBody()
            .jsonPath("$.email").isEqualTo(email)
            .jsonPath("$.status").isEqualTo("INVITED")
            .jsonPath("$.role").isEqualTo("NEW_RECRUIT")
            .jsonPath("$.department").isEqualTo("Payments")
            .jsonPath("$.startDate").isEqualTo("2026-10-01")
            .jsonPath("$.invitedAt").isNotEmpty
            .jsonPath("$.activatedAt").isEqualTo(null)
            .jsonPath("$.createdBy.email").isEqualTo(ADMIN_EMAIL)
            .jsonPath("$.currentAssignment").isEqualTo(null)
            .jsonPath("$.passwordHash").doesNotExist()
            .returnResult().responseBody!!.decodeToString()

        val stored = users.findById(body.jsonId())!!
        assertNull(stored.passwordHash)
        assertEquals(UserStatus.INVITED, stored.status)
        assertEquals(adminId(), stored.createdById)
        assertNull(stored.activatedAt)

        // the invitee can now complete signup
        post("/api/v1/auth/signup", mapOf("email" to email, "password" to password), null)
            .expectStatus().isOk.expectBody().jsonPath("$.user.status").isEqualTo("ACTIVE")
    }

    @Test
    fun `POST users creates managers and admins too`() {
        val admin = adminToken()
        for (role in listOf("MANAGER", "ADMIN")) {
            post("/api/v1/users", mapOf("email" to unique(role), "fullName" to "A $role", "role" to role), admin)
                .expectStatus().isCreated
                .expectBody().jsonPath("$.role").isEqualTo(role).jsonPath("$.status").isEqualTo("INVITED")
        }
    }

    @Test
    fun `POST users rejects a password property and validates fields`() {
        val admin = adminToken()
        post("/api/v1/users", mapOf("email" to unique("x"), "fullName" to "X", "role" to "MANAGER", "password" to "Secret1234!"), admin)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("password")
            .jsonPath("$.details[0].code").isEqualTo("NOT_ALLOWED")

        post("/api/v1/users", mapOf("email" to "not-an-email", "fullName" to "", "role" to "MANAGER"), admin)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[?(@.field == 'email')]").exists()
            .jsonPath("$.details[?(@.field == 'fullName')]").exists()

        post("/api/v1/users", mapOf("email" to unique("x"), "fullName" to "X"), admin)
            .expectError(400, "VALIDATION_FAILED")
            .jsonPath("$.details[0].field").isEqualTo("role")
            .jsonPath("$.details[0].code").isEqualTo("REQUIRED")
    }

    @Test
    fun `duplicate email is 409 EMAIL_ALREADY_EXISTS regardless of case`() {
        val existing = active(Role.NEW_RECRUIT)
        post("/api/v1/users", mapOf("email" to existing.email.uppercase(), "fullName" to "Dup", "role" to "MANAGER"), adminToken())
            .expectError(409, "EMAIL_ALREADY_EXISTS")
    }

    // ---- list -------------------------------------------------------------

    @Test
    fun `GET users filters by role and status, searches q and paginates with the envelope`() {
        val admin = adminToken()
        val tag = UUID.randomUUID().toString().take(6)
        val r1 = active(Role.NEW_RECRUIT, fullName = "Zed $tag Recruit")
        val r2 = invited(Role.NEW_RECRUIT, fullName = "Amy $tag Recruit")
        val m1 = active(Role.MANAGER, fullName = "Bob $tag Manager")

        get("/api/v1/users?q=$tag&size=2", admin)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.page").isEqualTo(0)
            .jsonPath("$.size").isEqualTo(2)
            .jsonPath("$.totalItems").isEqualTo(3)
            .jsonPath("$.totalPages").isEqualTo(2)
            .jsonPath("$.items.length()").isEqualTo(2)
            .jsonPath("$.items[0].id").isEqualTo(r2.id.toString()) // fullName asc default
            .jsonPath("$.items[1].id").isEqualTo(m1.id.toString())
            .jsonPath("$.items[0].passwordHash").doesNotExist()

        get("/api/v1/users?q=$tag&size=2&page=1", admin)
            .expectStatus().isOk
            .expectBody().jsonPath("$.items.length()").isEqualTo(1).jsonPath("$.items[0].id").isEqualTo(r1.id.toString())

        get("/api/v1/users?q=$tag&role=NEW_RECRUIT&status=INVITED", admin)
            .expectStatus().isOk
            .expectBody().jsonPath("$.totalItems").isEqualTo(1).jsonPath("$.items[0].id").isEqualTo(r2.id.toString())

        get("/api/v1/users?q=${r1.email.uppercase()}", admin)
            .expectStatus().isOk
            .expectBody().jsonPath("$.totalItems").isEqualTo(1)

        get("/api/v1/users?q=$tag&sort=fullName,desc", admin)
            .expectStatus().isOk
            .expectBody().jsonPath("$.items[0].id").isEqualTo(r1.id.toString())
    }

    @Test
    fun `GET users rejects bad paging and non-whitelisted sort`() {
        val admin = adminToken()
        get("/api/v1/users?size=0", admin).expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("size")
        get("/api/v1/users?size=101", admin).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/users?page=-1", admin).expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("page")
        get("/api/v1/users?sort=passwordHash,asc", admin).expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("sort")
        get("/api/v1/users?sort=fullName", admin).expectError(400, "VALIDATION_FAILED")
        get("/api/v1/users?role=WIZARD", admin).expectError(400, "VALIDATION_FAILED")
    }

    // ---- detail / update --------------------------------------------------

    @Test
    fun `GET users id returns detail and 404 for unknown`() {
        val admin = adminToken()
        val manager = active(Role.MANAGER)
        get("/api/v1/users/${manager.id}", admin)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.id").isEqualTo(manager.id.toString())
            .jsonPath("$.activeRecruitCount").isEqualTo(0)
            .jsonPath("$.currentAssignment").isEqualTo(null)
            .jsonPath("$.createdBy.id").isEqualTo(adminId().toString())
        get("/api/v1/users/${UUID.randomUUID()}", admin).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `PATCH users edits profile fields and role, explicit null clears department`() {
        val admin = adminToken()
        val user = active(Role.NEW_RECRUIT)
        patch("/api/v1/users/${user.id}", mapOf("fullName" to " Renamed ", "department" to "Ops", "startDate" to "2026-11-02"), admin)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.fullName").isEqualTo("Renamed")
            .jsonPath("$.department").isEqualTo("Ops")
            .jsonPath("$.startDate").isEqualTo("2026-11-02")

        patch("/api/v1/users/${user.id}", mapOf("department" to null, "role" to "MANAGER"), admin)
            .expectStatus().isOk
            .expectBody()
            .jsonPath("$.department").isEqualTo(null)
            .jsonPath("$.startDate").isEqualTo("2026-11-02")
            .jsonPath("$.role").isEqualTo("MANAGER")
            .jsonPath("$.fullName").isEqualTo("Renamed")

        patch("/api/v1/users/${user.id}", mapOf("status" to "ACTIVE"), admin)
            .expectError(400, "VALIDATION_FAILED").jsonPath("$.details[0].field").isEqualTo("status")
        patch("/api/v1/users/${UUID.randomUUID()}", mapOf("fullName" to "x"), admin).expectError(404, "NOT_FOUND")
    }

    @Test
    fun `email is editable while INVITED and locked afterwards`() {
        val admin = adminToken()
        val invitee = invited()
        val newEmail = unique("changed")
        patch("/api/v1/users/${invitee.id}", mapOf("email" to newEmail.uppercase()), admin)
            .expectStatus().isOk.expectBody().jsonPath("$.email").isEqualTo(newEmail)

        val other = active(Role.NEW_RECRUIT)
        patch("/api/v1/users/${invitee.id}", mapOf("email" to other.email), admin).expectError(409, "EMAIL_ALREADY_EXISTS")

        patch("/api/v1/users/${other.id}", mapOf("email" to unique("locked")), admin)
            .expectError(422, "EMAIL_LOCKED").jsonPath("$.details[0].field").isEqualTo("email")
        // same email re-sent on an ACTIVE user is a no-op, not a lock violation
        patch("/api/v1/users/${other.id}", mapOf("email" to other.email, "fullName" to "Same"), admin).expectStatus().isOk
    }

    @Test
    fun `role change is blocked while the user is party to an ACTIVE assignment`() {
        val admin = adminToken()
        val recruit = active(Role.NEW_RECRUIT)
        val manager = active(Role.MANAGER)
        post("/api/v1/assignments", mapOf("recruitId" to recruit.id, "managerId" to manager.id), admin).expectStatus().isCreated

        patch("/api/v1/users/${recruit.id}", mapOf("role" to "MANAGER"), admin)
            .expectError(422, "ROLE_CHANGE_BLOCKED_BY_ASSIGNMENT").jsonPath("$.details[0].field").isEqualTo("role")
        patch("/api/v1/users/${manager.id}", mapOf("role" to "ADMIN"), admin).expectError(422, "ROLE_CHANGE_BLOCKED_BY_ASSIGNMENT")
        // other fields still editable, and re-sending the same role is fine
        patch("/api/v1/users/${manager.id}", mapOf("role" to "MANAGER", "fullName" to "Still Manager"), admin).expectStatus().isOk
        assertEquals(Role.MANAGER, users.findById(manager.id)!!.role)
    }

    // ---- deactivate / reactivate -----------------------------------------

    @Test
    fun `deactivate blocks login, rejects the existing token on the next request and reactivate restores access`() {
        val admin = adminToken()
        val user = active(Role.MANAGER)
        val userToken = login(user.email)
        get("/api/v1/me", userToken).expectStatus().isOk

        post("/api/v1/users/${user.id}/deactivate", null, admin)
            .expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("DEACTIVATED")
        get("/api/v1/me", userToken).expectError(401, "UNAUTHENTICATED")
        post("/api/v1/auth/login", mapOf("email" to user.email, "password" to password), null).expectError(401, "INVALID_CREDENTIALS")

        post("/api/v1/users/${user.id}/reactivate", null, admin)
            .expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("ACTIVE")
        get("/api/v1/me", userToken).expectStatus().isOk
        assertNotNull(users.findById(user.id)!!.passwordHash)
    }

    @Test
    fun `deactivating an INVITED user revokes the invite and reactivating returns it to INVITED`() {
        val admin = adminToken()
        val invitee = invited()
        post("/api/v1/users/${invitee.id}/deactivate", null, admin)
            .expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("DEACTIVATED")
        post("/api/v1/auth/signup", mapOf("email" to invitee.email, "password" to password), null)
            .expectError(409, "ACCOUNT_ALREADY_ACTIVATED")

        post("/api/v1/users/${invitee.id}/reactivate", null, admin)
            .expectStatus().isOk.expectBody().jsonPath("$.status").isEqualTo("INVITED")
        post("/api/v1/auth/signup", mapOf("email" to invitee.email, "password" to password), null).expectStatus().isOk
    }

    @Test
    fun `admin cannot deactivate self`() {
        post("/api/v1/users/${adminId()}/deactivate", null, adminToken()).expectError(422, "CANNOT_DEACTIVATE_SELF")
        assertEquals(UserStatus.ACTIVE, users.findById(adminId())!!.status)
    }

    @Test
    fun `deactivate and reactivate return 404 for unknown users`() {
        val admin = adminToken()
        post("/api/v1/users/${UUID.randomUUID()}/deactivate", null, admin).expectError(404, "NOT_FOUND")
        post("/api/v1/users/${UUID.randomUUID()}/reactivate", null, admin).expectError(404, "NOT_FOUND")
    }
}
