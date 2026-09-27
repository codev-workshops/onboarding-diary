package com.onboardingdiary.issue

import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ResolutionNotesRequiredException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow

class ResolutionNotesRuleTest {

    @Test
    fun `only RESOLVED and CLOSED require notes`() {
        assertEquals(setOf(IssueStatus.RESOLVED, IssueStatus.CLOSED), IssueStatus.entries.filter(ResolutionNotesRule::requiresNotes).toSet())
    }

    @Test
    fun `OPEN and IN_PROGRESS accept null or blank notes`() {
        for (s in listOf(IssueStatus.OPEN, IssueStatus.IN_PROGRESS)) {
            for (notes in listOf(null, "", "   ", "some notes")) {
                assertTrue(ResolutionNotesRule.isSatisfied(s, notes), "$s / '$notes'")
                assertDoesNotThrow { ResolutionNotesRule.require(s, notes) }
            }
        }
    }

    @Test
    fun `RESOLVED and CLOSED reject null and blank notes with RESOLUTION_NOTES_REQUIRED`() {
        for (s in listOf(IssueStatus.RESOLVED, IssueStatus.CLOSED)) {
            for (notes in listOf(null, "", " \t\n")) {
                assertFalse(ResolutionNotesRule.isSatisfied(s, notes), "$s / '$notes'")
                val ex = assertThrows(ResolutionNotesRequiredException::class.java) { ResolutionNotesRule.require(s, notes) }
                assertEquals(ErrorCode.RESOLUTION_NOTES_REQUIRED, ex.code)
                assertEquals(422, ex.code.status.value())
                assertEquals("resolutionNotes", ex.details.single().field)
            }
            assertTrue(ResolutionNotesRule.isSatisfied(s, "Fixed by re-imaging the laptop"))
        }
    }
}
