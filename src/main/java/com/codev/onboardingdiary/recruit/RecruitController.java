package com.codev.onboardingdiary.recruit;

import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Paging;
import com.codev.onboardingdiary.dashboard.DashboardDto;
import com.codev.onboardingdiary.dashboard.DashboardService;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.entry.feedback.FeedbackDto;
import com.codev.onboardingdiary.entry.feedback.FeedbackFilter;
import com.codev.onboardingdiary.entry.feedback.FeedbackService;
import com.codev.onboardingdiary.entry.feedback.FeedbackType;
import com.codev.onboardingdiary.entry.issue.IssueDto;
import com.codev.onboardingdiary.entry.issue.IssueFilter;
import com.codev.onboardingdiary.entry.issue.IssueService;
import com.codev.onboardingdiary.entry.issue.IssueSeverity;
import com.codev.onboardingdiary.entry.issue.IssueStatus;
import com.codev.onboardingdiary.entry.note.NoteDto;
import com.codev.onboardingdiary.entry.note.NoteFilter;
import com.codev.onboardingdiary.entry.note.NoteService;
import com.codev.onboardingdiary.entry.task.TaskCategory;
import com.codev.onboardingdiary.entry.task.TaskDto;
import com.codev.onboardingdiary.entry.task.TaskFilter;
import com.codev.onboardingdiary.entry.task.TaskService;
import com.codev.onboardingdiary.entry.task.TaskStatus;
import com.codev.onboardingdiary.user.CurrentUser;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserDto;
import java.time.LocalDate;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Read-only recruit oversight for managers and admins. There are no write endpoints here. */
@RestController
@RequestMapping("/api/recruits")
public class RecruitController {

  private final RecruitService recruits;
  private final CurrentUser currentUser;
  private final DashboardService dashboards;
  private final TaskService tasks;
  private final IssueService issues;
  private final FeedbackService feedback;
  private final NoteService notes;

  public RecruitController(
      RecruitService recruits,
      CurrentUser currentUser,
      DashboardService dashboards,
      TaskService tasks,
      IssueService issues,
      FeedbackService feedback,
      NoteService notes) {
    this.recruits = recruits;
    this.currentUser = currentUser;
    this.dashboards = dashboards;
    this.tasks = tasks;
    this.issues = issues;
    this.feedback = feedback;
    this.notes = notes;
  }

  @GetMapping
  PageResponse<RecruitSummaryDto> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return recruits.list(
        currentUser.get(), q, active, Paging.of(page, size, Sort.by("name", "id")));
  }

  @GetMapping("/{id}")
  UserDto get(@PathVariable Long id) {
    return recruits.get(currentUser.get(), id);
  }

  @GetMapping("/{id}/dashboard")
  DashboardDto dashboard(@PathVariable Long id) {
    return dashboards.forRecruit(visible(id));
  }

  @GetMapping("/{id}/tasks")
  PageResponse<TaskDto> tasks(
      @PathVariable Long id,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) TaskCategory category,
      @RequestParam(required = false) TaskStatus status,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return tasks.list(
        visible(id),
        new TaskFilter(from, to, category, status),
        Paging.of(page, size, EntrySpecs.NEWEST_FIRST));
  }

  @GetMapping("/{id}/issues")
  PageResponse<IssueDto> issues(
      @PathVariable Long id,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) IssueStatus status,
      @RequestParam(required = false) IssueSeverity severity,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return issues.list(
        visible(id),
        new IssueFilter(from, to, status, severity),
        Paging.of(page, size, EntrySpecs.NEWEST_FIRST));
  }

  @GetMapping("/{id}/feedback")
  PageResponse<FeedbackDto> feedback(
      @PathVariable Long id,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) FeedbackType type,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return feedback.list(
        visible(id),
        new FeedbackFilter(from, to, type),
        Paging.of(page, size, EntrySpecs.NEWEST_FIRST));
  }

  @GetMapping("/{id}/notes")
  PageResponse<NoteDto> notes(
      @PathVariable Long id,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) String tag,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return notes.list(
        visible(id), new NoteFilter(from, to, tag), Paging.of(page, size, EntrySpecs.NEWEST_FIRST));
  }

  private User visible(Long recruitId) {
    return recruits.requireVisible(currentUser.get(), recruitId);
  }
}
