package com.onboardingdiary.controller;

import com.onboardingdiary.dto.DashboardResponse;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @Operation(summary = "Aggregated dashboard scoped to the caller (recruit: own; manager: assigned recruits; admin: all)")
    public DashboardResponse get() {
        return dashboardService.load(CurrentUser.require());
    }
}
