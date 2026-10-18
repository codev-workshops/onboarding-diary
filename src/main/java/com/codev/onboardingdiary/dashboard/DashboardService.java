package com.codev.onboardingdiary.dashboard;

import com.codev.onboardingdiary.dashboard.DashboardDto.Counts;
import com.codev.onboardingdiary.dashboard.DashboardDto.IssueSummary;
import com.codev.onboardingdiary.dashboard.DashboardDto.OpenIssues;
import com.codev.onboardingdiary.dashboard.DashboardDto.RecentEntry;
import com.codev.onboardingdiary.dashboard.DashboardDto.TaskProgress;
import com.codev.onboardingdiary.entry.EntryBase;
import com.codev.onboardingdiary.entry.EntryType;
import com.codev.onboardingdiary.entry.feedback.FeedbackRepository;
import com.codev.onboardingdiary.entry.issue.IssueEntry;
import com.codev.onboardingdiary.entry.issue.IssueRepository;
import com.codev.onboardingdiary.entry.issue.IssueSeverity;
import com.codev.onboardingdiary.entry.issue.IssueStatus;
import com.codev.onboardingdiary.entry.note.NoteRepository;
import com.codev.onboardingdiary.entry.task.TaskRepository;
import com.codev.onboardingdiary.entry.task.TaskStatus;
import com.codev.onboardingdiary.user.User;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates a recruit's entries into dashboard figures. */
@Service
public class DashboardService {

  static final int TOP_OPEN_ISSUES = 5;
  static final int RECENT_ENTRIES = 10;

  private static final List<IssueStatus> OPEN_STATUSES =
      List.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS);
  private static final Comparator<IssueEntry> MOST_SEVERE_OLDEST_FIRST =
      Comparator.comparing(IssueEntry::getSeverity)
          .reversed()
          .thenComparing(IssueEntry::getEntryDate)
          .thenComparing(IssueEntry::getId);

  private final TaskRepository tasks;
  private final IssueRepository issues;
  private final FeedbackRepository feedback;
  private final NoteRepository notes;

  public DashboardService(
      TaskRepository tasks,
      IssueRepository issues,
      FeedbackRepository feedback,
      NoteRepository notes) {
    this.tasks = tasks;
    this.issues = issues;
    this.feedback = feedback;
    this.notes = notes;
  }

  @Transactional(readOnly = true)
  public DashboardDto forRecruit(User recruit) {
    Counts counts =
        new Counts(
            tasks.countByOwner(recruit),
            issues.countByOwner(recruit),
            feedback.countByOwner(recruit),
            notes.countByOwner(recruit));
    return new DashboardDto(
        counts, taskProgress(recruit, counts.tasks()), openIssues(recruit), recent(recruit));
  }

  private TaskProgress taskProgress(User recruit, long total) {
    Map<TaskStatus, Long> byStatus = new EnumMap<>(TaskStatus.class);
    for (TaskStatus status : TaskStatus.values()) {
      byStatus.put(status, 0L);
    }
    for (Object[] row : tasks.countByStatus(recruit)) {
      byStatus.put((TaskStatus) row[0], (Long) row[1]);
    }
    long done = byStatus.get(TaskStatus.DONE);
    Double percent = total == 0 ? null : Math.round(done * 1000.0 / total) / 10.0;
    return new TaskProgress(done, total, percent, byStatus);
  }

  private OpenIssues openIssues(User recruit) {
    List<IssueEntry> open = issues.findByOwnerAndStatusIn(recruit, OPEN_STATUSES);
    Map<IssueSeverity, Long> bySeverity = new LinkedHashMap<>();
    IssueSeverity[] severities = IssueSeverity.values();
    for (int i = severities.length - 1; i >= 0; i--) {
      bySeverity.put(severities[i], 0L);
    }
    open.forEach(issue -> bySeverity.merge(issue.getSeverity(), 1L, Long::sum));
    List<IssueSummary> top =
        open.stream()
            .sorted(MOST_SEVERE_OLDEST_FIRST)
            .limit(TOP_OPEN_ISSUES)
            .map(i -> new IssueSummary(i.getId(), i.getTitle(), i.getSeverity(), i.getEntryDate()))
            .toList();
    return new OpenIssues(open.size(), bySeverity, top);
  }

  private List<RecentEntry> recent(User recruit) {
    List<RecentEntry> merged =
        Stream.of(
            tasks.findTop10ByOwnerOrderByCreatedAtDesc(recruit).stream()
                .map(t -> entry(EntryType.TASK, t.getId(), t.getTitle(), t)),
            issues.findTop10ByOwnerOrderByCreatedAtDesc(recruit).stream()
                .map(i -> entry(EntryType.ISSUE, i.getId(), i.getTitle(), i)),
            feedback.findTop10ByOwnerOrderByCreatedAtDesc(recruit).stream()
                .map(f -> entry(EntryType.FEEDBACK, f.getId(), f.getSubject(), f)),
            notes.findTop10ByOwnerOrderByCreatedAtDesc(recruit).stream()
                .map(n -> entry(EntryType.NOTE, n.getId(), n.getTitle(), n)))
            .flatMap(s -> s)
            .collect(Collectors.toCollection(ArrayList::new));
    merged.sort(
        Comparator.comparing(RecentEntry::createdAt)
            .thenComparing(RecentEntry::id)
            .reversed());
    return merged.stream().limit(RECENT_ENTRIES).toList();
  }

  private static RecentEntry entry(
      EntryType type, Long id, String title, EntryBase source) {
    return new RecentEntry(type, id, title, source.getEntryDate(), source.getCreatedAt());
  }
}
