package com.codev.onboardingdiary.manager;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.dashboard.DashboardService;
import com.codev.onboardingdiary.dashboard.DashboardSummary;
import com.codev.onboardingdiary.dashboard.RecentEntry;
import com.codev.onboardingdiary.diary.PageResponse;
import com.codev.onboardingdiary.feedback.FeedbackResponse;
import com.codev.onboardingdiary.feedback.FeedbackService;
import com.codev.onboardingdiary.feedback.FeedbackType;
import com.codev.onboardingdiary.issue.IssueFilter;
import com.codev.onboardingdiary.issue.IssueResponse;
import com.codev.onboardingdiary.issue.IssueService;
import com.codev.onboardingdiary.issue.IssueSeverity;
import com.codev.onboardingdiary.issue.IssueStatus;
import com.codev.onboardingdiary.note.NoteResponse;
import com.codev.onboardingdiary.note.NoteService;
import com.codev.onboardingdiary.task.TaskCategory;
import com.codev.onboardingdiary.task.TaskFilter;
import com.codev.onboardingdiary.task.TaskPriority;
import com.codev.onboardingdiary.task.TaskResponse;
import com.codev.onboardingdiary.task.TaskService;
import com.codev.onboardingdiary.task.TaskStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only access to the diaries of a manager's recruits. Private notes are never exposed. */
@RestController
@RequestMapping("/api/manager/recruits")
public class ManagerController {

  private final ManagerService managerService;
  private final RecruitAccess recruitAccess;
  private final DashboardService dashboardService;
  private final TaskService taskService;
  private final IssueService issueService;
  private final FeedbackService feedbackService;
  private final NoteService noteService;

  public ManagerController(
      ManagerService managerService,
      RecruitAccess recruitAccess,
      DashboardService dashboardService,
      TaskService taskService,
      IssueService issueService,
      FeedbackService feedbackService,
      NoteService noteService) {
    this.managerService = managerService;
    this.recruitAccess = recruitAccess;
    this.dashboardService = dashboardService;
    this.taskService = taskService;
    this.issueService = issueService;
    this.feedbackService = feedbackService;
    this.noteService = noteService;
  }

  @GetMapping
  public List<RecruitSummary> list(@AuthenticationPrincipal AuthenticatedUser principal) {
    return managerService.recruits(principal);
  }

  @GetMapping("/{recruitId}")
  public RecruitSummary get(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long recruitId) {
    return managerService.recruit(principal, recruitId);
  }

  @GetMapping("/{recruitId}/dashboard")
  public DashboardSummary dashboard(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long recruitId) {
    recruitAccess.require(principal, recruitId);
    return dashboardService.summary(recruitId, false);
  }

  @GetMapping("/{recruitId}/recent")
  public List<RecentEntry> recent(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long recruitId,
      @RequestParam(defaultValue = "5") int limit) {
    recruitAccess.require(principal, recruitId);
    return dashboardService.recent(recruitId, limit, false);
  }

  @GetMapping("/{recruitId}/tasks")
  public PageResponse<TaskResponse> tasks(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long recruitId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<TaskCategory> category,
      @RequestParam(required = false) List<TaskStatus> status,
      @RequestParam(required = false) TaskPriority priority,
      @RequestParam(required = false) String q,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    recruitAccess.require(principal, recruitId);
    return taskService.list(
        recruitId, new TaskFilter(from, to, category, status, priority, q), pageable);
  }

  @GetMapping("/{recruitId}/issues")
  public PageResponse<IssueResponse> issues(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long recruitId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<IssueStatus> status,
      @RequestParam(required = false) List<IssueSeverity> severity,
      @RequestParam(required = false) String q,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    recruitAccess.require(principal, recruitId);
    return issueService.list(recruitId, new IssueFilter(from, to, status, severity, q), pageable);
  }

  @GetMapping("/{recruitId}/feedback")
  public PageResponse<FeedbackResponse> feedback(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long recruitId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<FeedbackType> type,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    recruitAccess.require(principal, recruitId);
    return feedbackService.list(recruitId, from, to, type, pageable);
  }

  @GetMapping("/{recruitId}/notes")
  public PageResponse<NoteResponse> notes(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long recruitId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<String> tag,
      @RequestParam(required = false) String q,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    recruitAccess.require(principal, recruitId);
    return noteService.list(recruitId, from, to, tag, q, true, pageable);
  }
}
