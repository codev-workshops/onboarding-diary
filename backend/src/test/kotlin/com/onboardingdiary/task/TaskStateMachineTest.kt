package com.onboardingdiary.task

import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.InvalidStateTransitionException
import com.onboardingdiary.task.TaskStatus.BLOCKED
import com.onboardingdiary.task.TaskStatus.DONE
import com.onboardingdiary.task.TaskStatus.IN_PROGRESS
import com.onboardingdiary.task.TaskStatus.TODO
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow

class TaskStateMachineTest {

    private val machine = TaskStateMachine.INSTANCE

    private val allowed = setOf(
        TODO to IN_PROGRESS, TODO to DONE,
        IN_PROGRESS to BLOCKED, IN_PROGRESS to DONE,
        BLOCKED to IN_PROGRESS, BLOCKED to TODO,
        DONE to IN_PROGRESS,
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
        for (s in TaskStatus.entries) assertTrue(machine.canTransition(s, s), "$s -> $s")
    }

    @Test
    fun `every other edge is rejected with INVALID_STATE_TRANSITION`() {
        val disallowed = TaskStatus.entries.flatMap { f -> TaskStatus.entries.map { t -> f to t } }
            .filter { (f, t) -> f != t && (f to t) !in allowed }
        assertEquals(setOf(TODO to BLOCKED, IN_PROGRESS to TODO, BLOCKED to DONE, DONE to TODO, DONE to BLOCKED), disallowed.toSet())
        for ((from, to) in disallowed) {
            assertFalse(machine.canTransition(from, to), "$from -> $to")
            val ex = assertThrows(InvalidStateTransitionException::class.java) { machine.requireTransition(from, to) }
            assertEquals(ErrorCode.INVALID_STATE_TRANSITION, ex.code)
            assertEquals("status", ex.details.single().field)
        }
    }
}
