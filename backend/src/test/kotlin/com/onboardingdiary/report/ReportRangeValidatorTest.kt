package com.onboardingdiary.report

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate

class ReportRangeValidatorTest {

    private fun failure(from: String?, to: String?): ApiException =
        assertThrows<ApiException> { ReportRangeValidator.validate(from, to) }.also { assertEquals(ErrorCode.VALIDATION_FAILED, it.code) }

    @Test
    fun `accepts from equal to to and spans up to 366 days`() {
        assertEquals(ReportRange(LocalDate.parse("2026-03-01"), LocalDate.parse("2026-03-01")), ReportRangeValidator.validate("2026-03-01", "2026-03-01"))
        val max = ReportRangeValidator.validate("2026-01-01", "2027-01-02")
        assertEquals(366, max.spanDays)
    }

    @Test
    fun `rejects from after to`() {
        val e = failure("2026-03-02", "2026-03-01")
        assertEquals(listOf("to" to DetailCode.OUT_OF_RANGE), e.details.map { it.field to it.code })
    }

    @Test
    fun `rejects spans over 366 days`() {
        val e = failure("2026-01-01", "2027-01-03")
        assertEquals(DetailCode.OUT_OF_RANGE, e.details.single().code)
        assertEquals("to", e.details.single().field)
    }

    @Test
    fun `reports missing and malformed dates per field`() {
        assertEquals(
            listOf("from" to DetailCode.REQUIRED, "to" to DetailCode.REQUIRED),
            failure(null, "").details.map { it.field to it.code },
        )
        assertEquals(
            listOf("from" to DetailCode.INVALID_FORMAT, "to" to DetailCode.INVALID_FORMAT),
            failure("01/02/2026", "2026-13-40").details.map { it.field to it.code },
        )
        assertEquals(listOf("to" to DetailCode.INVALID_FORMAT), failure("2026-01-01", "nope").details.map { it.field to it.code })
    }
}
