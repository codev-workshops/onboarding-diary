package com.codev.onboardingdiary.dashboard;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.dashboard.DashboardSummary.FeedbackStats;
import com.codev.onboardingdiary.dashboard.DashboardSummary.IssueStats;
import com.codev.onboardingdiary.dashboard.DashboardSummary.NoteStats;
import com.codev.onboardingdiary.dashboard.DashboardSummary.TaskStats;
import com.codev.onboardingdiary.dashboard.DashboardSummary.WeeklyCount;
import com.codev.onboardingdiary.dashboard.RecentEntry.EntryType;
import com.codev.onboardingdiary.feedback.FeedbackRepository;
import com.codev.onboardingdiary.feedback.FeedbackType;
import com.codev.onboardingdiary.issue.Issue;
import com.codev.onboardingdiary.issue.IssueRepository;
import com.codev.onboardingdiary.issue.IssueResponse;
import com.codev.onboardingdiary.issue.IssueSeverity;
import com.codev.onboardingdiary.issue.IssueStatus;
import com.codev.onboardingdiary.note.NoteRepository;
import com.codev.onboardingdiary.task.TaskRepository;
import com.codev.onboardingdiary.task.TaskStatus;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds dashboard aggregates for a single user's diary. */
@Service
public class DashboardService {

  public static final Set<IssueStatus> OPEN_STATUSES =
      Set.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS);

  static final int TREND_WEEKS = 8;
  static final int TOP_OPEN_ISSUES = 5;
  static final int MAX_RECENT = 20;

  private static final Comparator<Issue> MOST_URGENT_FIRST =
      Comparator.comparing(Issue::getSeverity, Comparator.reverseOrder())
          .thenComparing(Issue::getEntryDate)
          .thenComparing(Issue::getId);

  private final TaskRepository taskRepository;
  private final IssueRepository issueRepository;
  private final FeedbackRepository feedbackRepository;
  private final NoteRepository noteRepository;
  private final ProfileRepository profileRepository;
  private final Clock clock;

  public DashboardService(
      TaskRepository taskRepository,
      IssueRepository issueRepository,
      FeedbackRepository feedbackRepository,
      NoteRepository noteRepository,
      ProfileRepository profileRepository,
      Clock clock) {
    this.taskRepository = taskRepository;
    this.issueRepository = issueRepository;
    this.feedbackRepository = feedbackRepository;
    this.noteRepository = noteRepository;
    this.profileRepository = profileRepository;
    this.clock = clock;
  }

  /**
   * Summary of {@code ownerId}'s diary. Private notes are counted only when {@code ownerView} is
   * true, i.e. when the owners look at their own dashboard.
   */
  @Transactional(readOnly = true)
  public DashboardSummary summary(Long ownerId, boolean ownerView) {
    Profile profile =
        profileRepository
            .findById(ownerId)
            .orElseThrow(() -> ApiException.notFound("Profile not found"));
    LocalDate today = LocalDate.now(clock);
    List<Issue> openIssues = issueRepository.findByOwnerIdAndStatusIn(ownerId, OPEN_STATUSES);
    return new DashboardSummary(
        profile.getStartDate(),
        ChronoUnit.DAYS.between(profile.getStartDate(), today),
        taskStats(ownerId),
        issueStats(openIssues),
        feedbackStats(ownerId),
        new NoteStats(
            ownerView
                ? noteRepository.countByOwnerId(ownerId)
                : noteRepository.countByOwnerIdAndSharedTrue(ownerId)),
        weeklyCompletedTrend(ownerId, today),
        openIssues.stream()
            .sorted(MOST_URGENT_FIRST)
            .limit(TOP_OPEN_ISSUES)
            .map(IssueResponse::from)
            .toList());
  }

  /** Most recently created or updated entries across all four logs. */
  @Transactional(readOnly = true)
  public List<RecentEntry> recent(Long ownerId, int limit, boolean ownerView) {
    int size = Math.max(1, Math.min(limit, MAX_RECENT));
    Pageable latest = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "updatedAt", "id"));
    Stream<RecentEntry> tasks =
        taskRepository.findByOwnerId(ownerId, latest).stream()
            .map(
                t ->
                    new RecentEntry(
                        EntryType.TASK,
                        t.getId(),
                        t.getEntryDate(),
                        t.getTitle(),
                        t.getStatus().name(),
                        t.getUpdatedAt()));
    Stream<RecentEntry> issues =
        issueRepository.findByOwnerId(ownerId, latest).stream()
            .map(
                i ->
                    new RecentEntry(
                        EntryType.ISSUE,
                        i.getId(),
                        i.getEntryDate(),
                        i.getTitle(),
                        i.getStatus().name(),
                        i.getUpdatedAt()));
    Stream<RecentEntry> feedback =
        feedbackRepository.findByOwnerId(ownerId, latest).stream()
            .map(
                f ->
                    new RecentEntry(
                        EntryType.FEEDBACK,
                        f.getId(),
                        f.getEntryDate(),
                        f.getSubject(),
                        f.getType().name(),
                        f.getUpdatedAt()));
    Stream<RecentEntry> notes =
        (ownerView
                ? noteRepository.findByOwnerId(ownerId, latest)
                : noteRepository.findByOwnerIdAndSharedTrue(ownerId, latest))
            .stream()
                .map(
                    n ->
                        new RecentEntry(
                            EntryType.NOTE,
                            n.getId(),
                            n.getEntryDate(),
                            n.getTitle(),
                            null,
                            n.getUpdatedAt()));
    return Stream.of(tasks, issues, feedback, notes)
        .flatMap(s -> s)
        .sorted(Comparator.comparing(RecentEntry::updatedAt).reversed())
        .limit(size)
        .toList();
  }

  /** Latest time any of the owner's entries was created or changed, or null if there are none. */
  @Transactional(readOnly = true)
  public Instant lastActivityAt(Long ownerId) {
    return Stream.of(
            taskRepository.findLastUpdatedAt(ownerId),
            issueRepository.findLastUpdatedAt(ownerId),
            feedbackRepository.findLastUpdatedAt(ownerId),
            noteRepository.findLastUpdatedAt(ownerId))
        .filter(Objects::nonNull)
        .max(Comparator.naturalOrder())
        .orElse(null);
  }

  private TaskStats taskStats(Long ownerId) {
    Map<TaskStatus, Long> byStatus =
        countsByKey(TaskStatus.class, taskRepository.countByStatus(ownerId));
    long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
    return new TaskStats(total, byStatus, percentage(byStatus.get(TaskStatus.COMPLETED), total));
  }

  private static IssueStats issueStats(List<Issue> openIssues) {
    Map<IssueSeverity, Long> bySeverity = zeroCounts(IssueSeverity.class);
    openIssues.forEach(issue -> bySeverity.merge(issue.getSeverity(), 1L, Long::sum));
    return new IssueStats(openIssues.size(), bySeverity);
  }

  private FeedbackStats feedbackStats(Long ownerId) {
    Map<FeedbackType, Long> byType =
        countsByKey(FeedbackType.class, feedbackRepository.countByType(ownerId));
    return new FeedbackStats(byType.values().stream().mapToLong(Long::longValue).sum(), byType);
  }

  private List<WeeklyCount> weeklyCompletedTrend(Long ownerId, LocalDate today) {
    LocalDate currentWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    LocalDate firstWeek = currentWeek.minusWeeks(TREND_WEEKS - 1L);
    long[] counts = new long[TREND_WEEKS];
    for (Instant completedAt :
        taskRepository.findCompletedAtSince(
            ownerId, firstWeek.atStartOfDay(ZoneOffset.UTC).toInstant())) {
      LocalDate day = LocalDate.ofInstant(completedAt, ZoneOffset.UTC);
      int week = (int) ChronoUnit.WEEKS.between(firstWeek, day);
      if (week >= 0 && week < TREND_WEEKS) {
        counts[week]++;
      }
    }
    List<WeeklyCount> trend = new ArrayList<>(TREND_WEEKS);
    for (int week = 0; week < TREND_WEEKS; week++) {
      trend.add(new WeeklyCount(firstWeek.plusWeeks(week), counts[week]));
    }
    return trend;
  }

  static double percentage(long part, long total) {
    return total == 0 ? 0 : Math.round(part * 1000.0 / total) / 10.0;
  }

  private static <E extends Enum<E>> Map<E, Long> countsByKey(Class<E> type, List<Object[]> rows) {
    Map<E, Long> counts = zeroCounts(type);
    for (Object[] row : rows) {
      counts.put(type.cast(row[0]), ((Number) row[1]).longValue());
    }
    return counts;
  }

  private static <E extends Enum<E>> Map<E, Long> zeroCounts(Class<E> type) {
    Map<E, Long> counts = new EnumMap<>(type);
    for (E constant : type.getEnumConstants()) {
      counts.put(constant, 0L);
    }
    return counts;
  }
}
