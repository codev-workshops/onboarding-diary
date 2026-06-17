package com.onboardingdiary.controller;

import com.onboardingdiary.dto.DashboardResponse;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    public DashboardController(DashboardService dashboardService, UserRepository userRepository) {
        this.dashboardService = dashboardService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        DashboardResponse response;
        if (user.getRole() == Role.ADMIN) {
            response = dashboardService.getAdminDashboard();
        } else if (user.getRole() == Role.MANAGER) {
            response = dashboardService.getManagerDashboard(user.getId());
        } else {
            response = dashboardService.getRecruitDashboard(user.getId());
        }

        return ResponseEntity.ok(response);
    }
}
