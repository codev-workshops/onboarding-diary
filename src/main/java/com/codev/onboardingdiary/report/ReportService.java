package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.DateRules;
import com.codev.onboardingdiary.entry.EntryBase;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.entry.feedback.FeedbackEntry;
import com.codev.onboardingdiary.entry.feedback.FeedbackRepository;
import com.codev.onboardingdiary.entry.issue.IssueEntry;
import com.codev.onboardingdiary.entry.issue.IssueRepository;
import com.codev.onboardingdiary.entry.task.TaskEntry;
import com.codev.onboardingdiary.entry.task.TaskRepository;
import com.codev.onboardingdiary.recruit.RecruitService;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds date-range reports for a recruit the viewer is allowed to see. */
@Service
public class ReportService {

  static final int MAX_RANGE_DAYS = 366;

  private static final Sort OLDEST_FIRST = Sort.by("entryDate", "createdAt", "id");
  private static final List<String> TASK_HEADERS =
      List.of("date", "title", "category", "status", "priority", "description");
  private static final List<String> ISSUE_HEADERS =
      List.of(
          "date", "title", "severity", "status", "description", "resolution_notes", "resolved_at");
  private static final List<String> FEEDBACK_HEADERS = List.of("date", "subject", "type", "details");
  private static final List<String> COMBINED_HEADERS =
      List.of(
          "record_type", "date", "title", "category", "status", "priority", "severity", "type",
          "description", "resolution_notes");

  private final RecruitService recruits;
  private final TaskRepository tasks;
  private final IssueRepository issues;
  private final FeedbackRepository feedback;

  public ReportService(
      RecruitService recruits,
      TaskRepository tasks,
      IssueRepository issues,
      FeedbackRepository feedback) {
    this.recruits = recruits;
    this.tasks = tasks;
    this.issues = issues;
    this.feedback = feedback;
  }

  @Transactional(readOnly = true)
  public ReportTable build(
      User viewer, Long recruitId, LocalDate from, LocalDate to, ReportType type) {
    DateRules.requireValidRange(from, to);
    if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
      throw ApiException.fieldError("to", "range must not exceed " + MAX_RANGE_DAYS + " days");
    }
    User recruit = resolveRecruit(viewer, recruitId);
    String title = "Onboarding report: " + capitalize(type.name());
    return switch (type) {
      case TASKS -> table(title, recruit, from, to, TASK_HEADERS,
          ReportService.<TaskEntry>find(tasks::findAll, recruit, from, to).stream().map(ReportService::taskRow).toList());
      case ISSUES -> table(title, recruit, from, to, ISSUE_HEADERS,
          ReportService.<IssueEntry>find(issues::findAll, recruit, from, to).stream().map(ReportService::issueRow).toList());
      case FEEDBACK -> table(title, recruit, from, to, FEEDBACK_HEADERS,
          ReportService.<FeedbackEntry>find(feedback::findAll, recruit, from, to).stream()
              .map(ReportService::feedbackRow).toList());
      case COMBINED -> table(title, recruit, from, to, COMBINED_HEADERS,
          combinedRows(recruit, from, to));
    };
  }

  private User resolveRecruit(User viewer, Long recruitId) {
    if (viewer.hasRole(Role.RECRUIT)) {
      if (recruitId != null && !recruitId.equals(viewer.getId())) {
        throw ApiException.forbidden("Recruits can only report on themselves");
      }
      return viewer;
    }
    if (recruitId == null) {
      throw ApiException.fieldError("recruitId", "is required");
    }
    return recruits.requireVisible(viewer, recruitId);
  }

  private List<List<String>> combinedRows(User recruit, LocalDate from, LocalDate to) {
    List<Combined> rows = new ArrayList<>();
    ReportService.<TaskEntry>find(tasks::findAll, recruit, from, to).forEach(t -> rows.add(new Combined(t,
        row("TASK", t.getEntryDate(), t.getTitle(), t.getCategory(), t.getStatus(),
            t.getPriority(), null, null, t.getDescription(), null))));
    ReportService.<IssueEntry>find(issues::findAll, recruit, from, to).forEach(i -> rows.add(new Combined(i,
        row("ISSUE", i.getEntryDate(), i.getTitle(), null, i.getStatus(), null,
            i.getSeverity(), null, i.getDescription(), i.getResolutionNotes()))));
    ReportService.<FeedbackEntry>find(feedback::findAll, recruit, from, to).forEach(f -> rows.add(new Combined(f,
        row("FEEDBACK", f.getEntryDate(), f.getSubject(), null, null, null, null,
            f.getType(), f.getDetails(), null))));
    rows.sort(
        Comparator.comparing((Combined c) -> c.entry().getEntryDate())
            .thenComparing(c -> c.entry().getCreatedAt()));
    return rows.stream().map(Combined::cells).toList();
  }

  private record Combined(EntryBase entry, List<String> cells) {}

  private interface Finder<T> {
    List<T> findAll(Specification<T> spec, Sort sort);
  }

  private static <T extends EntryBase> List<T> find(
      Finder<T> finder, User recruit, LocalDate from, LocalDate to) {
    Specification<T> spec =
        Specification.where(EntrySpecs.<T>ownedBy(recruit)).and(EntrySpecs.dateBetween(from, to));
    return finder.findAll(spec, OLDEST_FIRST);
  }

  private static List<String> taskRow(TaskEntry t) {
    return row(t.getEntryDate(), t.getTitle(), t.getCategory(), t.getStatus(), t.getPriority(),
        t.getDescription());
  }

  private static List<String> issueRow(IssueEntry i) {
    return row(i.getEntryDate(), i.getTitle(), i.getSeverity(), i.getStatus(), i.getDescription(),
        i.getResolutionNotes(), i.getResolvedAt());
  }

  private static List<String> feedbackRow(FeedbackEntry f) {
    return row(f.getEntryDate(), f.getSubject(), f.getType(), f.getDetails());
  }

  private static List<String> row(Object... values) {
    return Arrays.stream(values).map(v -> v == null ? "" : Objects.toString(v)).toList();
  }

  private static ReportTable table(String title, User recruit, LocalDate from, LocalDate to,
      List<String> headers, List<List<String>> rows) {
    return new ReportTable(title, recruit.getName(), from, to, headers, rows);
  }

  private static String capitalize(String value) {
    return value.charAt(0) + value.substring(1).toLowerCase();
  }
}
