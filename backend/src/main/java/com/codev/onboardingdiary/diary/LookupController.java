package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.feedback.FeedbackType;
import com.codev.onboardingdiary.issue.IssueSeverity;
import com.codev.onboardingdiary.issue.IssueStatus;
import com.codev.onboardingdiary.task.TaskCategory;
import com.codev.onboardingdiary.task.TaskPriority;
import com.codev.onboardingdiary.task.TaskStatus;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Enum values for the UI so it does not hard-code them. */
@RestController
@RequestMapping("/api/lookups")
public class LookupController {

  public record Lookups(
      List<TaskCategory> taskCategories,
      List<TaskStatus> taskStatuses,
      List<TaskPriority> taskPriorities,
      List<IssueSeverity> issueSeverities,
      List<IssueStatus> issueStatuses,
      List<FeedbackType> feedbackTypes) {}

  private static final Lookups LOOKUPS =
      new Lookups(
          List.of(TaskCategory.values()),
          List.of(TaskStatus.values()),
          List.of(TaskPriority.values()),
          List.of(IssueSeverity.values()),
          List.of(IssueStatus.values()),
          List.of(FeedbackType.values()));

  @GetMapping
  public Lookups get() {
    return LOOKUPS;
  }
}
