package com.onboardingdiary.controller;

import com.onboardingdiary.dto.response.AnalyticsResponse;
import com.onboardingdiary.security.UserPrincipal;
import com.onboardingdiary.service.AnalyticsService;
import com.onboardingdiary.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<AnalyticsResponse> getAnalytics(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(analyticsService.getAnalytics(principal.getId()));
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<AnalyticsResponse> getAnalyticsForUser(@AuthenticationPrincipal UserPrincipal principal,
                                                                   @PathVariable UUID userId) {
        userService.verifyManagerAccess(principal.getId(), principal.getRole(), userId);
        return ResponseEntity.ok(analyticsService.getAnalytics(userId));
    }
}
