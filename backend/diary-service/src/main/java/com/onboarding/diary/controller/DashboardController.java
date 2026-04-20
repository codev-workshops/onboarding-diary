package com.onboarding.diary.controller;

import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.security.SecurityUtils;
import com.onboarding.diary.dto.DashboardResponse;
import com.onboarding.diary.service.DashboardService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard() {
        String userId = SecurityUtils.getCurrentUserId();
        return ResponseEntity.ok(dashboardService.getDashboard(userId));
    }

    @GetMapping("/recruit/{userId}")
    public ResponseEntity<DashboardResponse> getRecruitDashboard(@PathVariable String userId) {
        String role = SecurityUtils.getCurrentUserRole();
        if (!"MANAGER".equals(role) && !"ADMIN".equals(role)) {
            throw new AccessDeniedException("Only managers and admins can view recruit dashboards");
        }
        return ResponseEntity.ok(dashboardService.getDashboard(userId));
    }

    @GetMapping("/overview")
    public ResponseEntity<DashboardResponse> getAdminDashboard() {
        String role = SecurityUtils.getCurrentUserRole();
        if (!"ADMIN".equals(role)) {
            throw new AccessDeniedException("Only admins can view the overview dashboard");
        }
        return ResponseEntity.ok(dashboardService.getAdminDashboard());
    }
}
