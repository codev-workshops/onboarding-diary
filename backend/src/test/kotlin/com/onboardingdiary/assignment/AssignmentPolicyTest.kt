package com.onboardingdiary.assignment

import com.onboardingdiary.api.error.AssignmentUnchangedException
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.InvalidAssignmentPartyException
import com.onboardingdiary.user.Role
import com.onboardingdiary.user.User
import com.onboardingdiary.user.UserStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import java.time.Instant
import java.util.UUID

class AssignmentPolicyTest {

    private fun user(role: Role, status: UserStatus = UserStatus.ACTIVE, id: UUID = UUID.randomUUID()) = User(
        id = id, email = "$id@example.com", passwordHash = "x", role = role, status = status, fullName = "U",
        department = null, startDate = null, createdById = null, invitedAt = Instant.EPOCH, activatedAt = Instant.EPOCH,
        createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH,
    )

    private fun assignment(recruitId: UUID, managerId: UUID, status: AssignmentStatus = AssignmentStatus.ACTIVE) = Assignment(
        id = UUID.randomUUID(), recruitId = recruitId, managerId = managerId, assignedById = UUID.randomUUID(),
        status = status, assignedAt = Instant.EPOCH, endedAt = null, note = null, createdAt = Instant.EPOCH, updatedAt = Instant.EPOCH,
    )

    // ---- party validation (INV-05) ---------------------------------------

    @Test
    fun `active recruit and active manager are valid parties`() {
        assertDoesNotThrow { AssignmentPolicy.validateParties(user(Role.NEW_RECRUIT), user(Role.MANAGER)) }
    }

    @Test
    fun `recruit must be an ACTIVE NEW_RECRUIT`() {
        listOf(
            user(Role.MANAGER),
            user(Role.ADMIN),
            user(Role.NEW_RECRUIT, UserStatus.INVITED),
            user(Role.NEW_RECRUIT, UserStatus.DEACTIVATED),
        ).forEach { recruit ->
            val ex = assertThrows(InvalidAssignmentPartyException::class.java) {
                AssignmentPolicy.validateParties(recruit, user(Role.MANAGER))
            }
            assertEquals(ErrorCode.INVALID_ASSIGNMENT_PARTY, ex.code)
            assertEquals("recruitId", ex.details.single().field)
        }
    }

    @Test
    fun `manager must be an ACTIVE MANAGER`() {
        listOf(
            user(Role.NEW_RECRUIT),
            user(Role.ADMIN),
            user(Role.MANAGER, UserStatus.INVITED),
            user(Role.MANAGER, UserStatus.DEACTIVATED),
        ).forEach { manager ->
            val ex = assertThrows(InvalidAssignmentPartyException::class.java) {
                AssignmentPolicy.validateParties(user(Role.NEW_RECRUIT), manager)
            }
            assertEquals("managerId", ex.details.single().field)
        }
    }

    @Test
    fun `recruit and manager must differ`() {
        val same = user(Role.NEW_RECRUIT)
        val ex = assertThrows(InvalidAssignmentPartyException::class.java) { AssignmentPolicy.validateParties(same, same) }
        assertEquals("managerId", ex.details.single().field)
    }

    // ---- state transition (REQ-FUNC-016..018) -----------------------------

    @Test
    fun `no current assignment yields Assign`() {
        assertEquals(AssignmentTransition.Assign, AssignmentPolicy.transition(null, UUID.randomUUID()))
    }

    @Test
    fun `current assignment to another manager yields Reassign with the row to end`() {
        val recruit = UUID.randomUUID()
        val current = assignment(recruit, UUID.randomUUID())
        val t = AssignmentPolicy.transition(current, UUID.randomUUID())
        assertEquals(AssignmentTransition.Reassign(current), t)
    }

    @Test
    fun `same active manager is ASSIGNMENT_UNCHANGED`() {
        val manager = UUID.randomUUID()
        val ex = assertThrows(AssignmentUnchangedException::class.java) {
            AssignmentPolicy.transition(assignment(UUID.randomUUID(), manager), manager)
        }
        assertEquals(ErrorCode.ASSIGNMENT_UNCHANGED, ex.code)
    }

    @Test
    fun `an already REASSIGNED row does not block a new assignment to the same manager`() {
        val manager = UUID.randomUUID()
        val ended = assignment(UUID.randomUUID(), manager, AssignmentStatus.REASSIGNED)
        assertEquals(AssignmentTransition.Assign, AssignmentPolicy.transition(ended, manager))
    }
}
