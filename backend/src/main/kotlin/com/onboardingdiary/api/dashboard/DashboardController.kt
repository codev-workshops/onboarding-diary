package com.onboardingdiary.api.dashboard

import com.onboardingdiary.security.AuthenticatedUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/v1/dashboard")
class DashboardController(private val service: DashboardService) {

    /** operationId: getDashboard */
    @GetMapping
    suspend fun get(
        @AuthenticationPrincipal principal: AuthenticatedUser,
        @RequestParam recruitId: UUID?,
    ): DashboardSummaryResponse = service.summary(principal, recruitId)
}
