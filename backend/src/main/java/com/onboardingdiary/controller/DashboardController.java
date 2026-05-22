package com.onboardingdiary.controller;

import com.onboardingdiary.dto.response.DashboardResponse;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.DashboardService;
import com.onboardingdiary.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(dashboardService.getDashboard(principal.getId()));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<DashboardResponse> getDashboardForUser(@AuthenticationPrincipal UserPrincipal principal,
                                                                   @PathVariable UUID userId) {
        userService.verifyManagerAccess(principal.getId(), principal.getRole(), userId);
        return ResponseEntity.ok(dashboardService.getDashboardForUser(userId));
    }
}
