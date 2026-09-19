package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.DashboardService;
import com.codev.onboardingdiary.web.dto.RecruitSummaryDto;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal AppUserDetails principal, Model model) {
        model.addAttribute("dashboard", dashboardService.forUser(principal, principal.getId()));
        if (principal.getRole() != Role.RECRUIT) {
            List<RecruitSummaryDto> recruits = dashboardService.recruitSummaries(principal);
            List<Long> ids = recruits.stream().map(RecruitSummaryDto::id).toList();
            model.addAttribute("recruits", recruits);
            model.addAttribute("teamTasksByStatus", dashboardService.teamTasksByStatus(ids));
            model.addAttribute("teamIssuesBySeverity", dashboardService.teamIssuesBySeverity(ids));
            model.addAttribute("teamOpenIssues", dashboardService.teamOpenIssues(ids));
        }
        return "dashboard";
    }
}
