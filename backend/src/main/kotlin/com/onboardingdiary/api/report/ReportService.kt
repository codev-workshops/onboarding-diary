package com.onboardingdiary.api.report

import com.onboardingdiary.api.error.ForbiddenException
import com.onboardingdiary.api.error.NotFoundException
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.feedback.FeedbackVisibility
import com.onboardingdiary.report.ReportDocument
import com.onboardingdiary.report.ReportFormat
import com.onboardingdiary.report.ReportRange
import com.onboardingdiary.report.ReportRecruit
import com.onboardingdiary.report.ReportRenderer
import com.onboardingdiary.report.ReportRepository
import com.onboardingdiary.report.ReportType
import com.onboardingdiary.security.AuthenticatedUser
import com.onboardingdiary.user.UserRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service
import java.time.Clock
import java.util.UUID

data class GeneratedReport(val filename: String, val format: ReportFormat, val bytes: ByteArray, val feedbackOmitted: Boolean)

/**
 * S8 report generation (REQ-FUNC-080..086). Scoping is the dashboard's
 * ([RecruitScopeResolver]); feedback visibility is decision D3
 * ([FeedbackVisibility]): `FEEDBACK` without visibility → 403 `FORBIDDEN`,
 * `COMBINED` without visibility → feedback section omitted and
 * [GeneratedReport.feedbackOmitted] set (→ `X-Report-Omitted: feedback`).
 */
@Service
class ReportService(
    private val scope: RecruitScopeResolver,
    private val feedbackVisibility: FeedbackVisibility,
    private val reports: ReportRepository,
    private val users: UserRepository,
    renderers: List<ReportRenderer>,
    private val clock: Clock,
) {
    private val renderers = renderers.associateBy { it.format }

    suspend fun generate(
        principal: AuthenticatedUser,
        recruitId: UUID?,
        range: ReportRange,
        type: ReportType,
        format: ReportFormat,
    ): GeneratedReport {
        val target = scope.resolveTargetRecruit(principal, recruitId)
        val canReadFeedback = feedbackVisibility.canRead(principal, target)
        if (type == ReportType.FEEDBACK && !canReadFeedback) throw ForbiddenException()
        val includeFeedback = type.includesFeedback && canReadFeedback
        val feedbackOmitted = type.includesFeedback && !canReadFeedback

        val renderer = renderers.getValue(format)
        return withContext(Dispatchers.IO) {
            val recruit = users.findById(target) ?: throw NotFoundException()
            val sections = reports.load(target, range, type.includesTasks, type.includesIssues, includeFeedback)
            val document = ReportDocument(
                recruit = ReportRecruit(recruit.id, recruit.fullName, recruit.email),
                range = range,
                type = type,
                generatedAt = clock.instant(),
                tasks = sections.tasks,
                issues = sections.issues,
                feedback = sections.feedback,
                feedbackOmitted = feedbackOmitted,
            )
            GeneratedReport(document.filename(format), format, renderer.render(document), feedbackOmitted)
        }
    }
}
