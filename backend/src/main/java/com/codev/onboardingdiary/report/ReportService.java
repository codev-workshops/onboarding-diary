package com.codev.onboardingdiary.report;

import com.codev.onboardingdiary.audit.AuditAction;
import com.codev.onboardingdiary.audit.AuditLogService;
import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.feedback.Feedback;
import com.codev.onboardingdiary.feedback.FeedbackRepository;
import com.codev.onboardingdiary.issue.Issue;
import com.codev.onboardingdiary.issue.IssueRepository;
import com.codev.onboardingdiary.report.ReportRow.RecordType;
import com.codev.onboardingdiary.task.Task;
import com.codev.onboardingdiary.task.TaskRepository;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.User;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Loads, scopes and audits report data. Rendering is done by the CSV and PDF writers. */
@Service
public class ReportService {

  static final int MAX_RANGE_DAYS = 366;
  static final int PREVIEW_ROWS = 50;

  private final ReportAccessPolicy accessPolicy;
  private final ProfileRepository profileRepository;
  private final TaskRepository taskRepository;
  private final IssueRepository issueRepository;
  private final FeedbackRepository feedbackRepository;
  private final AuditLogService auditLog;
  private final Clock clock;
  private final String organization;

  public ReportService(
      ReportAccessPolicy accessPolicy,
      ProfileRepository profileRepository,
      TaskRepository taskRepository,
      IssueRepository issueRepository,
      FeedbackRepository feedbackRepository,
      AuditLogService auditLog,
      Clock clock,
      @Value("${app.report.organization:Onboarding Diary}") String organization) {
    this.accessPolicy = accessPolicy;
    this.profileRepository = profileRepository;
    this.taskRepository = taskRepository;
    this.issueRepository = issueRepository;
    this.feedbackRepository = feedbackRepository;
    this.auditLog = auditLog;
    this.clock = clock;
    this.organization = organization;
  }

  /** Report parameters as received from the API. */
  public record Request(
      ReportType type,
      ReportFormat format,
      LocalDate from,
      LocalDate to,
      Long userId,
      ReportScope scope) {}

  /** Loads the data for a download and records it in the audit log. */
  @Transactional
  public ReportData generate(AuthenticatedUser viewer, Request request) {
    ReportData data = load(viewer, request);
    Map<String, Object> details = new LinkedHashMap<>();
    details.put("type", request.type());
    details.put("format", request.format());
    details.put("scope", request.scope());
    details.put("from", request.from().toString());
    details.put("to", request.to().toString());
    details.put("recruits", data.subjects().size());
    details.put("rows", data.rows().size());
    Long target = request.scope() == ReportScope.SELF ? data.subjects().get(0).id() : null;
    auditLog.record(viewer.id(), AuditAction.REPORT_GENERATED, target, details);
    return data;
  }

  @Transactional(readOnly = true)
  public ReportPreview preview(AuthenticatedUser viewer, Request request) {
    ReportData data = load(viewer, request);
    List<ReportColumn> columns = ReportColumn.forType(data.type(), data.multiRecruit());
    Map<String, Long> counts = new LinkedHashMap<>();
    for (RecordType section : data.sections()) {
      counts.put(section.name(), (long) data.rowsOf(section).size());
    }
    List<List<String>> rows =
        data.rows().stream()
            .limit(PREVIEW_ROWS)
            .map(row -> columns.stream().map(column -> column.value().apply(row)).toList())
            .toList();
    return new ReportPreview(
        data.type(),
        data.scope(),
        data.from(),
        data.to(),
        data.subjects(),
        counts,
        data.rows().size(),
        columns.stream().map(c -> new ReportPreview.Column(c.key(), c.label())).toList(),
        rows);
  }

  /** onboarding-report_&lt;name&gt;_&lt;type&gt;_&lt;from&gt;_&lt;to&gt;.&lt;ext&gt; */
  public static String fileName(ReportData data, ReportFormat format) {
    String name =
        switch (data.scope()) {
          case SELF -> slug(data.subjects().get(0).fullName());
          case TEAM -> "team";
          case ALL -> "all-recruits";
        };
    return String.join(
            "_",
            "onboarding-report",
            name,
            data.type().name().toLowerCase(Locale.ROOT),
            data.from().toString(),
            data.to().toString())
        + "."
        + format.name().toLowerCase(Locale.ROOT);
  }

  private ReportData load(AuthenticatedUser viewer, Request request) {
    validate(request);
    List<Profile> profiles = accessPolicy.subjects(viewer, request.scope(), request.userId());
    List<ReportSubject> subjects = profiles.stream().map(this::toSubject).toList();
    Map<Long, ReportSubject> byId =
        subjects.stream().collect(Collectors.toMap(ReportSubject::id, Function.identity()));
    List<ReportRow> rows = new ArrayList<>();
    if (!byId.isEmpty()) {
      List<RecordType> sections = ReportData.sections(request.type());
      if (sections.contains(RecordType.TASK)) {
        taskRepository
            .findByOwnerIdInAndEntryDateBetweenOrderByOwnerIdAscEntryDateAscIdAsc(
                byId.keySet(), request.from(), request.to())
            .forEach(task -> rows.add(toRow(task, byId.get(task.getOwnerId()))));
      }
      if (sections.contains(RecordType.ISSUE)) {
        issueRepository
            .findByOwnerIdInAndEntryDateBetweenOrderByOwnerIdAscEntryDateAscIdAsc(
                byId.keySet(), request.from(), request.to())
            .forEach(issue -> rows.add(toRow(issue, byId.get(issue.getOwnerId()))));
      }
      if (sections.contains(RecordType.FEEDBACK)) {
        feedbackRepository
            .findByOwnerIdInAndEntryDateBetweenOrderByOwnerIdAscEntryDateAscIdAsc(
                byId.keySet(), request.from(), request.to())
            .forEach(feedback -> rows.add(toRow(feedback, byId.get(feedback.getOwnerId()))));
      }
    }
    rows.sort(
        Comparator.comparing(ReportRow::recruitName, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(ReportRow::ownerId)
            .thenComparing(ReportRow::date)
            .thenComparing(ReportRow::recordType)
            .thenComparing(ReportRow::id));
    String generatedBy = profileRepository.findFullNameByUserId(viewer.id()).orElse(viewer.email());
    return new ReportData(
        organization,
        request.type(),
        request.scope(),
        request.from(),
        request.to(),
        subjects,
        rows,
        generatedBy,
        clock.instant());
  }

  private static void validate(Request request) {
    if (request.from().isAfter(request.to())) {
      throw ApiException.invalidField("from", "'from' must not be after 'to'");
    }
    if (ChronoUnit.DAYS.between(request.from(), request.to()) >= MAX_RANGE_DAYS) {
      throw ApiException.invalidField(
          "to", "The date range can be at most " + MAX_RANGE_DAYS + " days");
    }
  }

  private ReportSubject toSubject(Profile profile) {
    User manager = profile.getManager();
    String managerName =
        manager == null
            ? null
            : profileRepository.findFullNameByUserId(manager.getId()).orElse(manager.getEmail());
    return new ReportSubject(
        profile.getUserId(),
        profile.getFullName(),
        profile.getUser().getEmail(),
        profile.getDepartment(),
        profile.getStartDate(),
        managerName);
  }

  private static ReportRow toRow(Task task, ReportSubject subject) {
    return new ReportRow(
        RecordType.TASK,
        task.getId(),
        subject.id(),
        subject.fullName(),
        subject.email(),
        task.getEntryDate(),
        task.getTitle(),
        task.getDescription(),
        task.getCategory().name(),
        task.getStatus().name(),
        task.getPriority().name(),
        null,
        null,
        null,
        task.getCompletedAt(),
        null);
  }

  private static ReportRow toRow(Issue issue, ReportSubject subject) {
    return new ReportRow(
        RecordType.ISSUE,
        issue.getId(),
        subject.id(),
        subject.fullName(),
        subject.email(),
        issue.getEntryDate(),
        issue.getTitle(),
        issue.getDescription(),
        null,
        issue.getStatus().name(),
        null,
        issue.getSeverity().name(),
        null,
        issue.getResolutionNotes(),
        null,
        issue.getResolvedAt());
  }

  private static ReportRow toRow(Feedback feedback, ReportSubject subject) {
    return new ReportRow(
        RecordType.FEEDBACK,
        feedback.getId(),
        subject.id(),
        subject.fullName(),
        subject.email(),
        feedback.getEntryDate(),
        feedback.getSubject(),
        feedback.getDetails(),
        null,
        null,
        null,
        null,
        feedback.getType().name(),
        null,
        null,
        null);
  }

  private static String slug(String name) {
    String slug = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-");
    slug = slug.replaceAll("(^-+|-+$)", "");
    return slug.isEmpty() ? "user" : slug;
  }
}
