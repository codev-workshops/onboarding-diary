package com.onboardingdiary.api.dashboard

import com.onboardingdiary.dashboard.DashboardRepository
import com.onboardingdiary.entry.RecruitScopeResolver
import com.onboardingdiary.feedback.FeedbackVisibility
import com.onboardingdiary.security.AuthenticatedUser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.stereotype.Service
import java.util.UUID

/**
 * Dashboard read model (REQ-FUNC-070..074). Scope first (recruit → self,
 * manager → assigned or 403 NOT_ASSIGNED, admin → any), then D3: feedback
 * counts and FEEDBACK recent entries are only computed when
 * [FeedbackVisibility.canRead] holds for the target recruit.
 */
@Service
class DashboardService(
    private val dashboard: DashboardRepository,
    private val scope: RecruitScopeResolver,
    private val feedbackVisibility: FeedbackVisibility,
) {
    suspend fun summary(principal: AuthenticatedUser, recruitId: UUID?): DashboardSummaryResponse {
        val target = scope.resolveTargetRecruit(principal, recruitId)
        val includeFeedback = feedbackVisibility.canRead(principal, target)
        val aggregates = withContext(Dispatchers.IO) { dashboard.aggregate(target, includeFeedback) }
        return DashboardSummaryResponse.from(target, aggregates)
    }
}
