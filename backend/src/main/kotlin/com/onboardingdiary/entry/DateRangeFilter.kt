package com.onboardingdiary.entry

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import java.time.LocalDate
import java.time.format.DateTimeParseException

/**
 * Inclusive `from`/`to` query window shared by every entry list endpoint.
 * Parsed from the raw query strings so a malformed date is a
 * `400 VALIDATION_FAILED` field detail rather than `MALFORMED_REQUEST`.
 */
data class DateRangeFilter(val from: LocalDate? = null, val to: LocalDate? = null) {

    val isEmpty: Boolean get() = from == null && to == null

    fun contains(date: LocalDate): Boolean =
        (from == null || !date.isBefore(from)) && (to == null || !date.isAfter(to))

    companion object {
        val NONE = DateRangeFilter()

        fun parse(from: String?, to: String?): DateRangeFilter {
            val details = mutableListOf<ErrorDetail>()
            val f = parseDate("from", from, details)
            val t = parseDate("to", to, details)
            if (f != null && t != null && f.isAfter(t)) {
                details += ErrorDetail("from", DetailCode.OUT_OF_RANGE, "must be on or before 'to'")
            }
            if (details.isNotEmpty()) throw ApiException(ErrorCode.VALIDATION_FAILED, details = details)
            return DateRangeFilter(f, t)
        }

        private fun parseDate(name: String, raw: String?, details: MutableList<ErrorDetail>): LocalDate? {
            if (raw.isNullOrBlank()) return null
            return try {
                LocalDate.parse(raw)
            } catch (_: DateTimeParseException) {
                details += ErrorDetail(name, DetailCode.INVALID_FORMAT, "must be an ISO date (YYYY-MM-DD)")
                null
            }
        }
    }
}
