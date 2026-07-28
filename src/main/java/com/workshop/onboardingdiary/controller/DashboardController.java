package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.DashboardResponse;
import com.workshop.onboardingdiary.service.DashboardService;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Dashboard endpoint (REQUIREMENTS 4.6). */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardResponse summary(Principal principal,
                                     @RequestParam(name = "userId", required = false) Long userId) {
        return dashboardService.summary(principal.getName(), userId);
    }
}
