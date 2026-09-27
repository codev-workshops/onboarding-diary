package com.onboardingdiary.issue

import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.InvalidStateTransitionException
import com.onboardingdiary.issue.IssueStatus.CLOSED
import com.onboardingdiary.issue.IssueStatus.IN_PROGRESS
import com.onboardingdiary.issue.IssueStatus.OPEN
import com.onboardingdiary.issue.IssueStatus.RESOLVED
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow

class IssueStateMachineTest {

    private val machine = IssueStateMachine.INSTANCE

    private val allowed = setOf(
        OPEN to IN_PROGRESS, OPEN to RESOLVED,
        IN_PROGRESS to RESOLVED,
        RESOLVED to CLOSED, RESOLVED to IN_PROGRESS,
        CLOSED to IN_PROGRESS,
    )

    @Test
    fun `every documented edge is allowed`() {
        for ((from, to) in allowed) {
            assertTrue(machine.canTransition(from, to), "$from -> $to")
            assertDoesNotThrow { machine.requireTransition(from, to) }
        }
    }

    @Test
    fun `self transitions are always allowed`() {
        for (s in IssueStatus.entries) assertTrue(machine.canTransition(s, s), "$s -> $s")
    }

    @Test
    fun `OPEN cannot be CLOSED directly`() {
        val ex = assertThrows(InvalidStateTransitionException::class.java) { machine.requireTransition(OPEN, CLOSED) }
        assertEquals(ErrorCode.INVALID_STATE_TRANSITION, ex.code)
    }

    @Test
    fun `every other edge is rejected with INVALID_STATE_TRANSITION`() {
        val disallowed = IssueStatus.entries.flatMap { f -> IssueStatus.entries.map { t -> f to t } }
            .filter { (f, t) -> f != t && (f to t) !in allowed }
        assertEquals(
            setOf(OPEN to CLOSED, IN_PROGRESS to OPEN, IN_PROGRESS to CLOSED, RESOLVED to OPEN, CLOSED to OPEN, CLOSED to RESOLVED),
            disallowed.toSet(),
        )
        for ((from, to) in disallowed) {
            assertFalse(machine.canTransition(from, to), "$from -> $to")
            val ex = assertThrows(InvalidStateTransitionException::class.java) { machine.requireTransition(from, to) }
            assertEquals(ErrorCode.INVALID_STATE_TRANSITION, ex.code)
            assertEquals("status", ex.details.single().field)
        }
    }
}
