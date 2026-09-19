package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.AuthorizationService;
import com.codev.onboardingdiary.service.DashboardService;
import com.codev.onboardingdiary.service.FeedbackService;
import com.codev.onboardingdiary.service.IssueService;
import com.codev.onboardingdiary.service.NoteService;
import com.codev.onboardingdiary.service.TaskService;
import com.codev.onboardingdiary.web.dto.FeedbackFilter;
import com.codev.onboardingdiary.web.dto.IssueFilter;
import com.codev.onboardingdiary.web.dto.NoteFilter;
import com.codev.onboardingdiary.web.dto.RecruitSummaryDto;
import com.codev.onboardingdiary.web.dto.TaskFilter;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/manager")
public class ManagerController {

    private final DashboardService dashboardService;
    private final TaskService taskService;
    private final IssueService issueService;
    private final FeedbackService feedbackService;
    private final NoteService noteService;
    private final AuthorizationService authorizationService;
    private final ChartJson chartJson;

    public ManagerController(DashboardService dashboardService,
                             TaskService taskService,
                             IssueService issueService,
                             FeedbackService feedbackService,
                             NoteService noteService,
                             AuthorizationService authorizationService,
                             ChartJson chartJson) {
        this.dashboardService = dashboardService;
        this.taskService = taskService;
        this.issueService = issueService;
        this.feedbackService = feedbackService;
        this.noteService = noteService;
        this.authorizationService = authorizationService;
        this.chartJson = chartJson;
    }

    @GetMapping("/recruits")
    public String recruits(@AuthenticationPrincipal AppUserDetails principal, Model model) {
        List<RecruitSummaryDto> recruits = dashboardService.recruitSummaries(principal);
        List<Long> ids = recruits.stream().map(RecruitSummaryDto::id).toList();
        model.addAttribute("recruits", recruits);
        model.addAttribute("teamOpenIssues", dashboardService.teamOpenIssues(ids));
        model.addAttribute("chartData", chartJson.write(Map.of(
                "teamTasksByStatus", dashboardService.teamTasksByStatus(ids),
                "teamIssuesBySeverity", dashboardService.teamIssuesBySeverity(ids))));
        return "manager/recruits";
    }

    @GetMapping("/recruits/{id}")
    public String recruitDetail(@AuthenticationPrincipal AppUserDetails principal,
                                @PathVariable Long id,
                                Model model) {
        User recruit = authorizationService.requireReadAccess(principal, id);
        model.addAttribute("recruit", recruit);
        model.addAttribute("dashboard", dashboardService.forUser(principal, id));
        model.addAttribute("tasks", taskService.list(principal, id, TaskFilter.empty()));
        model.addAttribute("issues", issueService.list(principal, id, IssueFilter.empty()));
        model.addAttribute("feedbackEntries", feedbackService.list(principal, id, FeedbackFilter.empty()));
        model.addAttribute("notes", noteService.list(principal, id, NoteFilter.empty()));
        return "manager/recruit-detail";
    }
}
