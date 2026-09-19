package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.DashboardService;
import com.codev.onboardingdiary.web.dto.DashboardDto;
import com.codev.onboardingdiary.web.dto.RecruitSummaryDto;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    private final DashboardService dashboardService;
    private final ChartJson chartJson;

    public DashboardController(DashboardService dashboardService, ChartJson chartJson) {
        this.dashboardService = dashboardService;
        this.chartJson = chartJson;
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal AppUserDetails principal, Model model) {
        DashboardDto dashboard = dashboardService.forUser(principal, principal.getId());
        model.addAttribute("dashboard", dashboard);
        Map<String, Object> charts = new LinkedHashMap<>();
        charts.put("tasksByStatus", dashboard.tasksByStatus());
        charts.put("issuesBySeverity", dashboard.issuesBySeverity());
        if (principal.getRole() != Role.RECRUIT) {
            List<RecruitSummaryDto> recruits = dashboardService.recruitSummaries(principal);
            List<Long> ids = recruits.stream().map(RecruitSummaryDto::id).toList();
            model.addAttribute("recruits", recruits);
            model.addAttribute("teamOpenIssues", dashboardService.teamOpenIssues(ids));
            charts.put("teamTasksByStatus", dashboardService.teamTasksByStatus(ids));
            charts.put("teamIssuesBySeverity", dashboardService.teamIssuesBySeverity(ids));
        }
        model.addAttribute("chartData", chartJson.write(charts));
        return "dashboard";
    }
}
