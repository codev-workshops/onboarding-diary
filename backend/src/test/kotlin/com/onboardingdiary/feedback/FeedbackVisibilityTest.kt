package com.onboardingdiary.feedback

import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.user.Role
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import java.util.UUID

/** Truth table for D3: role × ownership × live assignment state. */
class FeedbackVisibilityTest {

    private val self = UUID.randomUUID()
    private val other = UUID.randomUUID()

    private fun principal(role: Role) = AuthenticatedUser(self, "p@example.com", role)

    private fun visibility(assigned: Boolean) = FeedbackVisibility { managerId, recruitId ->
        require(managerId == self) { "guard must be asked about the principal" }
        require(recruitId == other) { "guard must be asked about the target recruit" }
        assigned
    }

    @ParameterizedTest(name = "{0} owner={1} assigned={2} -> {3}")
    @CsvSource(
        // role,        owner, assigned, canRead
        "NEW_RECRUIT,   true,  false,    true",
        "NEW_RECRUIT,   false, false,    false",
        "NEW_RECRUIT,   false, true,     false", // a recruit is never a manager; assignment is irrelevant
        "MANAGER,       false, true,     true",
        "MANAGER,       false, false,    false",
        "ADMIN,         false, false,    true",
        "ADMIN,         false, true,     true",
    )
    fun `canRead follows owner OR ADMIN OR actively assigned MANAGER`(role: Role, owner: Boolean, assigned: Boolean, expected: Boolean) = runBlocking {
        val target = if (owner) self else other
        val v = if (owner) FeedbackVisibility { _, _ -> error("owner check must not hit the assignment guard") } else visibility(assigned)
        assertEquals(expected, v.canRead(principal(role), target))
    }

    @Test
    fun `assignment is consulted on every call so a reassignment flips the answer immediately`() = runBlocking {
        var assigned = true
        val v = FeedbackVisibility { _, _ -> assigned }
        val manager = principal(Role.MANAGER)
        assertEquals(true, v.canRead(manager, other))
        assigned = false
        assertEquals(false, v.canRead(manager, other))
        assigned = true
        assertEquals(true, v.canRead(manager, other))
    }

    @Test
    fun `requireCanRead hides non-visible notes as NOT_FOUND`() = runBlocking {
        val v = visibility(assigned = false)
        assertThrows(NotFoundException::class.java) { runBlocking { v.requireCanRead(principal(Role.MANAGER), other) } }
        v.requireCanRead(principal(Role.ADMIN), other)
        v.requireCanRead(principal(Role.NEW_RECRUIT), self)
    }
}
