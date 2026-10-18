package com.codev.onboardingdiary.recruit;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Texts;
import com.codev.onboardingdiary.dashboard.DashboardService;
import com.codev.onboardingdiary.entry.issue.IssueRepository;
import com.codev.onboardingdiary.entry.task.TaskRepository;
import com.codev.onboardingdiary.entry.task.TaskStatus;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserDto;
import com.codev.onboardingdiary.user.UserRef;
import com.codev.onboardingdiary.user.UserRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only access to recruits for managers (assigned recruits) and admins (all). */
@Service
public class RecruitService {

  private final UserRepository users;
  private final TaskRepository tasks;
  private final IssueRepository issues;

  public RecruitService(UserRepository users, TaskRepository tasks, IssueRepository issues) {
    this.users = users;
    this.tasks = tasks;
    this.issues = issues;
  }

  /**
   * Returns the recruit if the viewer may see them.
   *
   * @throws ApiException 404 if no such recruit, 403 if a manager does not oversee them
   */
  @Transactional(readOnly = true)
  public User requireVisible(User viewer, Long recruitId) {
    User recruit =
        users
            .findById(recruitId)
            .filter(user -> user.hasRole(Role.RECRUIT))
            .orElseThrow(() -> ApiException.notFound("Recruit not found"));
    if (viewer.hasRole(Role.MANAGER) && !oversees(viewer, recruit)) {
      throw ApiException.forbidden("You do not oversee this recruit");
    }
    return recruit;
  }

  @Transactional(readOnly = true)
  public UserDto get(User viewer, Long recruitId) {
    return UserDto.of(requireVisible(viewer, recruitId));
  }

  @Transactional(readOnly = true)
  public PageResponse<RecruitSummaryDto> list(
      User viewer, String query, Boolean active, Pageable pageable) {
    Specification<User> spec =
        Specification.where(isRecruit())
            .and(viewer.hasRole(Role.MANAGER) ? managedBy(viewer) : null)
            .and(matches(query))
            .and(active == null ? null : (root, q, cb) -> cb.equal(root.get("active"), active));
    return PageResponse.of(users.findAll(spec, pageable), this::summarize);
  }

  /** Active recruits the viewer can see: assigned ones for managers, all for admins. */
  @Transactional(readOnly = true)
  public List<User> activeVisibleRecruits(User viewer) {
    Specification<User> spec =
        Specification.where(isRecruit())
            .and(viewer.hasRole(Role.MANAGER) ? managedBy(viewer) : null)
            .and((root, q, cb) -> cb.isTrue(root.get("active")));
    return users.findAll(spec, Sort.by("name", "id"));
  }

  private RecruitSummaryDto summarize(User recruit) {
    long total = tasks.countByOwner(recruit);
    long done = tasks.countByOwnerAndStatus(recruit, TaskStatus.DONE);
    Double percent = total == 0 ? null : Math.round(done * 1000.0 / total) / 10.0;
    return new RecruitSummaryDto(
        recruit.getId(),
        recruit.getName(),
        recruit.getEmail(),
        recruit.getDepartment(),
        recruit.getStartDate(),
        UserRef.of(recruit.getManager()),
        recruit.isActive(),
        issues.countByOwnerAndStatusIn(recruit, DashboardService.OPEN_STATUSES),
        percent);
  }

  private static boolean oversees(User manager, User recruit) {
    return recruit.getManager() != null && recruit.getManager().getId().equals(manager.getId());
  }

  private static Specification<User> isRecruit() {
    return (root, q, cb) -> cb.equal(root.get("role"), Role.RECRUIT);
  }

  private static Specification<User> managedBy(User manager) {
    return (root, q, cb) -> cb.equal(root.get("manager"), manager);
  }

  private static Specification<User> matches(String rawQuery) {
    String query = Texts.trimToNull(rawQuery);
    if (query == null) {
      return null;
    }
    String pattern = "%" + query.toLowerCase(Locale.ROOT) + "%";
    return (root, q, cb) ->
        cb.or(cb.like(cb.lower(root.get("name")), pattern), cb.like(root.get("email"), pattern));
  }
}
