package com.codev.onboardingdiary.manager;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.dashboard.DashboardService;
import com.codev.onboardingdiary.dashboard.DashboardSummary;
import com.codev.onboardingdiary.issue.IssueSeverity;
import com.codev.onboardingdiary.manager.TeamSummary.TeamIssue;
import com.codev.onboardingdiary.task.TaskStatus;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only progress views of the recruits a manager (or admin) may see. */
@Service
public class ManagerService {

  static final int INACTIVITY_WORKING_DAYS = 5;

  private final ProfileRepository profileRepository;
  private final DashboardService dashboardService;
  private final RecruitAccess recruitAccess;
  private final Clock clock;

  public ManagerService(
      ProfileRepository profileRepository,
      DashboardService dashboardService,
      RecruitAccess recruitAccess,
      Clock clock) {
    this.profileRepository = profileRepository;
    this.dashboardService = dashboardService;
    this.recruitAccess = recruitAccess;
    this.clock = clock;
  }

  /** Recruits assigned to the manager; admins see every recruit. */
  @Transactional(readOnly = true)
  public List<Profile> visibleRecruits(AuthenticatedUser viewer) {
    return viewer.hasRole(Role.ADMIN)
        ? profileRepository.findByRole(Role.RECRUIT)
        : profileRepository.findByManager_IdOrderByFullNameAsc(viewer.id());
  }

  @Transactional(readOnly = true)
  public List<RecruitSummary> recruits(AuthenticatedUser viewer) {
    return visibleRecruits(viewer).stream().map(this::summarize).toList();
  }

  @Transactional(readOnly = true)
  public RecruitSummary recruit(AuthenticatedUser viewer, Long recruitId) {
    return summarize(recruitAccess.require(viewer, recruitId));
  }

  @Transactional(readOnly = true)
  public TeamSummary team(AuthenticatedUser viewer) {
    List<RecruitSummary> recruits = new ArrayList<>();
    List<TeamIssue> urgent = new ArrayList<>();
    for (Profile profile : visibleRecruits(viewer)) {
      DashboardSummary summary = dashboardService.summary(profile.getUserId(), false);
      recruits.add(summarize(profile, summary));
      summary.topOpenIssues().stream()
          .filter(issue -> issue.severity().compareTo(IssueSeverity.HIGH) >= 0)
          .forEach(
              issue ->
                  urgent.add(new TeamIssue(profile.getUserId(), profile.getFullName(), issue)));
    }
    double averageCompletion =
        recruits.stream().mapToDouble(RecruitSummary::completionPct).average().orElse(0);
    return new TeamSummary(
        recruits.size(),
        Math.round(averageCompletion * 10) / 10.0,
        recruits.stream().mapToLong(RecruitSummary::openIssues).sum(),
        recruits.stream().filter(RecruitSummary::atRisk).count(),
        recruits,
        urgent);
  }

  private RecruitSummary summarize(Profile profile) {
    return summarize(profile, dashboardService.summary(profile.getUserId(), false));
  }

  private RecruitSummary summarize(Profile profile, DashboardSummary summary) {
    Long id = profile.getUserId();
    LocalDate today = LocalDate.now(clock);
    Instant lastActivity = dashboardService.lastActivityAt(id);
    LocalDate cutoff = workingDaysAgo(today, INACTIVITY_WORKING_DAYS);
    boolean inactive =
        !profile.getStartDate().isAfter(cutoff)
            && (lastActivity == null
                || lastActivity.isBefore(cutoff.atStartOfDay(ZoneOffset.UTC).toInstant()));
    long urgentIssues =
        summary.issues().openBySeverity().get(IssueSeverity.HIGH)
            + summary.issues().openBySeverity().get(IssueSeverity.CRITICAL);
    return new RecruitSummary(
        id,
        profile.getFullName(),
        profile.getUser().getEmail(),
        profile.getJobTitle(),
        profile.getDepartment(),
        profile.getStartDate(),
        profile.getUser().isEnabled(),
        summary.tasks().total(),
        summary.tasks().byStatus().get(TaskStatus.COMPLETED),
        summary.tasks().completionPct(),
        summary.issues().open(),
        urgentIssues,
        lastActivity,
        inactive,
        inactive || urgentIssues > 0);
  }

  /** The date {@code days} working days (Mon-Fri) back, counting today if it is a working day. */
  static LocalDate workingDaysAgo(LocalDate today, int days) {
    LocalDate date = today;
    int counted = isWorkingDay(date) ? 1 : 0;
    while (counted < days) {
      date = date.minusDays(1);
      if (isWorkingDay(date)) {
        counted++;
      }
    }
    return date;
  }

  private static boolean isWorkingDay(LocalDate date) {
    return date.getDayOfWeek() != DayOfWeek.SATURDAY && date.getDayOfWeek() != DayOfWeek.SUNDAY;
  }
}
