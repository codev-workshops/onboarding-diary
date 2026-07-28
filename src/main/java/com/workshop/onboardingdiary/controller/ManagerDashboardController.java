package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.ManagerDashboardResponse;
import com.workshop.onboardingdiary.service.ManagerDashboardService;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Team-wide manager dashboard endpoint (REQUIREMENTS 10.4). Manager-only for the caller's own
 * oversight scope; the optional {@code managerId} may only be passed by an Admin to view a single
 * manager's team, and there is no global all-managers rollup.
 */
@RestController
@RequestMapping("/api/manager-dashboard")
public class ManagerDashboardController {

    private final ManagerDashboardService managerDashboardService;

    public ManagerDashboardController(ManagerDashboardService managerDashboardService) {
        this.managerDashboardService = managerDashboardService;
    }

    @GetMapping
    public ManagerDashboardResponse summary(Principal principal,
                                            @RequestParam(name = "managerId", required = false) Long managerId) {
        return managerDashboardService.summary(principal.getName(), managerId);
    }
}
