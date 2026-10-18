package com.codev.onboardingdiary.team;

import com.codev.onboardingdiary.dashboard.DashboardService;
import com.codev.onboardingdiary.entry.feedback.FeedbackRepository;
import com.codev.onboardingdiary.entry.feedback.FeedbackType;
import com.codev.onboardingdiary.entry.issue.IssueEntry;
import com.codev.onboardingdiary.entry.issue.IssueRepository;
import com.codev.onboardingdiary.entry.issue.IssueSeverity;
import com.codev.onboardingdiary.entry.task.TaskRepository;
import com.codev.onboardingdiary.entry.task.TaskStatus;
import com.codev.onboardingdiary.recruit.RecruitService;
import com.codev.onboardingdiary.team.TeamDashboardDto.Concern;
import com.codev.onboardingdiary.team.TeamDashboardDto.RecruitProgress;
import com.codev.onboardingdiary.user.User;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aggregates progress across a manager's team (extension X3). */
@Service
public class TeamDashboardService {

  private final RecruitService recruits;
  private final TaskRepository tasks;
  private final IssueRepository issues;
  private final FeedbackRepository feedback;

  public TeamDashboardService(
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
  public TeamDashboardDto forViewer(User viewer) {
    List<User> team = recruits.activeVisibleRecruits(viewer);
    Map<IssueSeverity, Long> bySeverity = new EnumMap<>(IssueSeverity.class);
    IssueSeverity[] severities = IssueSeverity.values();
    for (int i = severities.length - 1; i >= 0; i--) {
      bySeverity.put(severities[i], 0L);
    }
    List<RecruitProgress> progress = new ArrayList<>();
    long openTotal = 0;
    for (User recruit : team) {
      List<IssueEntry> open =
          issues.findByOwnerAndStatusIn(recruit, DashboardService.OPEN_STATUSES);
      open.forEach(issue -> bySeverity.merge(issue.getSeverity(), 1L, Long::sum));
      openTotal += open.size();
      long total = tasks.countByOwner(recruit);
      long done = tasks.countByOwnerAndStatus(recruit, TaskStatus.DONE);
      long critical =
          open.stream().filter(issue -> issue.getSeverity() == IssueSeverity.CRITICAL).count();
      progress.add(
          new RecruitProgress(
              recruit.getId(),
              recruit.getName(),
              done,
              total,
              total == 0 ? null : Math.round(done * 1000.0 / total) / 10.0,
              open.size(),
              critical));
    }
    progress.sort(
        Comparator.comparing(
            RecruitProgress::percent, Comparator.nullsFirst(Comparator.naturalOrder())));
    List<Concern> concerns =
        team.isEmpty()
            ? List.of()
            : feedback.findTop5ByOwnerInAndTypeOrderByCreatedAtDesc(team, FeedbackType.CONCERN)
                .stream()
                .map(f -> new Concern(f.getId(), f.getOwner().getId(), f.getOwner().getName(),
                    f.getSubject(), f.getEntryDate()))
                .toList();
    return new TeamDashboardDto(team.size(), openTotal, bySeverity, progress, concerns);
  }
}
