package com.onboardingdiary.entry

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.paging.enumParam
import com.onboardingdiary.task.TaskCategory
import com.onboardingdiary.task.TaskStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.LocalDate

class DateRangeFilterTest {

    @Test
    fun `absent parameters give an empty range`() {
        val r = DateRangeFilter.parse(null, "")
        assertTrue(r.isEmpty)
        assertTrue(r.contains(LocalDate.of(2000, 1, 1)))
    }

    @Test
    fun `open-ended and closed ranges parse and are inclusive`() {
        assertEquals(DateRangeFilter(LocalDate.of(2026, 1, 5), null), DateRangeFilter.parse("2026-01-05", null))
        assertEquals(DateRangeFilter(null, LocalDate.of(2026, 1, 5)), DateRangeFilter.parse(null, "2026-01-05"))
        val r = DateRangeFilter.parse("2026-01-05", "2026-01-10")
        assertTrue(r.contains(LocalDate.of(2026, 1, 5)))
        assertTrue(r.contains(LocalDate.of(2026, 1, 10)))
        assertFalse(r.contains(LocalDate.of(2026, 1, 11)))
        assertFalse(r.contains(LocalDate.of(2026, 1, 4)))
    }

    @Test
    fun `malformed dates are VALIDATION_FAILED INVALID_FORMAT per field`() {
        val ex = assertThrows(ApiException::class.java) { DateRangeFilter.parse("05/01/2026", "nope") }
        assertEquals(ErrorCode.VALIDATION_FAILED, ex.code)
        assertEquals(listOf("from" to DetailCode.INVALID_FORMAT, "to" to DetailCode.INVALID_FORMAT), ex.details.map { it.field to it.code })
    }

    @Test
    fun `from after to is OUT_OF_RANGE`() {
        val ex = assertThrows(ApiException::class.java) { DateRangeFilter.parse("2026-02-01", "2026-01-01") }
        assertEquals("from", ex.details.single().field)
        assertEquals(DetailCode.OUT_OF_RANGE, ex.details.single().code)
    }

    @Test
    fun `enum query binding accepts exact names and rejects unknown values`() {
        assertEquals(TaskStatus.IN_PROGRESS, enumParam<TaskStatus>("status", "IN_PROGRESS"))
        assertNull(enumParam<TaskCategory>("category", null))
        assertNull(enumParam<TaskCategory>("category", ""))
        val ex = assertThrows(ApiException::class.java) { enumParam<TaskCategory>("category", "training") }
        assertEquals(ErrorCode.VALIDATION_FAILED, ex.code)
        assertEquals("category", ex.details.single().field)
        assertEquals(DetailCode.INVALID_ENUM, ex.details.single().code)
    }
}
