package com.onboardingdiary.report

import com.onboardingdiary.api.error.ApiException
import com.onboardingdiary.api.error.DetailCode
import com.onboardingdiary.api.error.ErrorCode
import com.onboardingdiary.api.error.ErrorDetail
import com.onboardingdiary.feedback.FeedbackNote
import com.onboardingdiary.issue.IssueEntry
import com.onboardingdiary.task.TaskEntry
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.UUID

enum class ReportType(val includesTasks: Boolean, val includesIssues: Boolean, val includesFeedback: Boolean) {
    TASKS(true, false, false),
    ISSUES(false, true, false),
    FEEDBACK(false, false, true),
    COMBINED(true, true, true),
}

enum class ReportFormat(val mediaType: String, val extension: String) {
    PDF("application/pdf", "pdf"),
    CSV("text/csv; charset=UTF-8", "csv"),
}

/** Inclusive `from`..`to` window on `entryDate`, already validated (INV-10). */
data class ReportRange(val from: LocalDate, val to: LocalDate) {
    val spanDays: Long get() = ChronoUnit.DAYS.between(from, to)
}

/**
 * INV-10: both dates required ISO dates, `from <= to`, `(to - from) <= 366 days`.
 * Range violations are reported on `to` (US-12) as `400 VALIDATION_FAILED`.
 */
object ReportRangeValidator {
    const val MAX_SPAN_DAYS = 366L

    fun validate(from: String?, to: String?): ReportRange {
        val details = mutableListOf<ErrorDetail>()
        val f = parseDate("from", from, details)
        val t = parseDate("to", to, details)
        if (f != null && t != null) {
            if (f.isAfter(t)) {
                details += ErrorDetail("to", DetailCode.OUT_OF_RANGE, "must be on or after 'from'")
            } else if (ChronoUnit.DAYS.between(f, t) > MAX_SPAN_DAYS) {
                details += ErrorDetail("to", DetailCode.OUT_OF_RANGE, "range must not exceed $MAX_SPAN_DAYS days")
            }
        }
        if (details.isNotEmpty()) throw ApiException(ErrorCode.VALIDATION_FAILED, details = details)
        return ReportRange(f!!, t!!)
    }

    private fun parseDate(name: String, raw: String?, details: MutableList<ErrorDetail>): LocalDate? {
        if (raw.isNullOrBlank()) {
            details += ErrorDetail(name, DetailCode.REQUIRED, "is required")
            return null
        }
        return try {
            LocalDate.parse(raw)
        } catch (_: DateTimeParseException) {
            details += ErrorDetail(name, DetailCode.INVALID_FORMAT, "must be an ISO date (YYYY-MM-DD)")
            null
        }
    }
}

data class ReportRecruit(val id: UUID, val fullName: String, val email: String)

/**
 * Everything a renderer needs. A `null` section was not requested (or, for
 * feedback, not visible to the caller — then [feedbackOmitted] is set so the
 * response can carry `X-Report-Omitted: feedback`).
 */
data class ReportDocument(
    val recruit: ReportRecruit,
    val range: ReportRange,
    val type: ReportType,
    val generatedAt: Instant,
    val tasks: List<TaskEntry>?,
    val issues: List<IssueEntry>?,
    val feedback: List<FeedbackNote>?,
    val feedbackOmitted: Boolean,
) {
    val isEmpty: Boolean get() = tasks.isNullOrEmpty() && issues.isNullOrEmpty() && feedback.isNullOrEmpty()

    fun filename(format: ReportFormat): String = "onboarding-report-${recruit.id}-${range.from}_${range.to}.${format.extension}"

    companion object {
        const val NO_ENTRIES = "No entries in range"
    }
}

interface ReportRenderer {
    val format: ReportFormat

    /** Blocking; callers offload via `withContext(Dispatchers.IO)`. */
    fun render(document: ReportDocument): ByteArray
}
