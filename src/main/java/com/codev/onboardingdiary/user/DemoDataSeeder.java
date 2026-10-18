package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.DateRules;
import com.codev.onboardingdiary.entry.feedback.FeedbackEntry;
import com.codev.onboardingdiary.entry.feedback.FeedbackRepository;
import com.codev.onboardingdiary.entry.feedback.FeedbackType;
import com.codev.onboardingdiary.entry.issue.IssueEntry;
import com.codev.onboardingdiary.entry.issue.IssueRepository;
import com.codev.onboardingdiary.entry.issue.IssueSeverity;
import com.codev.onboardingdiary.entry.issue.IssueStatus;
import com.codev.onboardingdiary.entry.note.Note;
import com.codev.onboardingdiary.entry.note.NoteRepository;
import com.codev.onboardingdiary.entry.task.TaskCategory;
import com.codev.onboardingdiary.entry.task.TaskEntry;
import com.codev.onboardingdiary.entry.task.TaskPriority;
import com.codev.onboardingdiary.entry.task.TaskRepository;
import com.codev.onboardingdiary.entry.task.TaskStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Seeds a demo manager and two recruits with sample entries; runs once per database. */
@Component
@Order(2)
@ConditionalOnProperty(name = "app.seed.demo-data", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

  static final String MANAGER_EMAIL = "manager@demo.local";
  private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

  private final UserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final DateRules dateRules;
  private final TaskRepository tasks;
  private final IssueRepository issues;
  private final FeedbackRepository feedback;
  private final NoteRepository notes;

  public DemoDataSeeder(
      UserRepository users,
      PasswordEncoder passwordEncoder,
      DateRules dateRules,
      TaskRepository tasks,
      IssueRepository issues,
      FeedbackRepository feedback,
      NoteRepository notes) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.dateRules = dateRules;
    this.tasks = tasks;
    this.issues = issues;
    this.feedback = feedback;
    this.notes = notes;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (users.existsByEmail(MANAGER_EMAIL)) {
      return;
    }
    LocalDate today = dateRules.today();
    User manager = user(MANAGER_EMAIL, "Morgan Manager", Role.MANAGER, null, null, "Manager123");
    User alex = user("alex@demo.local", "Alex Recruit", Role.RECRUIT, manager,
        today.minusDays(14), "Recruit123");
    User priya = user("priya@demo.local", "Priya Recruit", Role.RECRUIT, manager,
        today.minusDays(5), "Recruit123");

    task(alex, today.minusDays(14), "Collect laptop and badge", TaskCategory.SETUP,
        TaskStatus.DONE, TaskPriority.HIGH);
    task(alex, today.minusDays(13), "Security awareness training", TaskCategory.TRAINING,
        TaskStatus.DONE, TaskPriority.HIGH);
    task(alex, today.minusDays(10), "Shadow on-call engineer", TaskCategory.SHADOWING,
        TaskStatus.DONE, TaskPriority.MEDIUM);
    task(alex, today.minusDays(6), "Set up local dev environment", TaskCategory.SETUP,
        TaskStatus.BLOCKED, TaskPriority.HIGH);
    task(alex, today.minusDays(2), "First starter ticket", TaskCategory.PROJECT_WORK,
        TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM);
    task(alex, today, "Read architecture docs", TaskCategory.DOCUMENTATION,
        TaskStatus.TODO, TaskPriority.LOW);
    issue(alex, today.minusDays(6), "No access to the build server", IssueSeverity.HIGH,
        IssueStatus.OPEN, null);
    issue(alex, today.minusDays(12), "VPN disconnects hourly", IssueSeverity.MEDIUM,
        IssueStatus.RESOLVED, "IT replaced the VPN profile.");
    feedback(alex, today.minusDays(7), "Great onboarding buddy", FeedbackType.POSITIVE,
        "My buddy answered every question quickly.");
    feedback(alex, today.minusDays(3), "Too many tools in week one", FeedbackType.SUGGESTION,
        "Spread tool setup over the first two weeks.");
    note(alex, today.minusDays(9), "Team rituals",
        "Stand-up 9:30, retro every second Friday.", List.of("team", "process"));

    task(priya, today.minusDays(5), "Collect laptop and badge", TaskCategory.SETUP,
        TaskStatus.DONE, TaskPriority.HIGH);
    task(priya, today.minusDays(4), "Meet the team", TaskCategory.MEETING,
        TaskStatus.DONE, TaskPriority.MEDIUM);
    task(priya, today.minusDays(1), "HR paperwork", TaskCategory.ADMIN,
        TaskStatus.TODO, TaskPriority.MEDIUM);
    issue(priya, today.minusDays(3), "Payroll portal login fails", IssueSeverity.CRITICAL,
        IssueStatus.IN_PROGRESS, null);
    feedback(priya, today.minusDays(2), "Unclear first-week schedule", FeedbackType.CONCERN,
        "I did not know where to be on day two.");
    note(priya, today.minusDays(4), "Useful links", "Wiki, HR portal, team calendar.",
        List.of("links"));
    log.warn(
        "Seeded demo accounts with published passwords; set APP_DEMO_DATA=false outside demos");
  }

  private User user(String email, String name, Role role, User manager, LocalDate start,
      String password) {
    User user = new User(email, passwordEncoder.encode(password), name, role);
    user.setDepartment("Engineering");
    user.setManager(manager);
    user.setStartDate(start);
    return users.save(user);
  }

  private void task(User owner, LocalDate date, String title, TaskCategory category,
      TaskStatus status, TaskPriority priority) {
    TaskEntry task = new TaskEntry(owner);
    task.setEntryDate(date);
    task.setTitle(title);
    task.setCategory(category);
    task.setStatus(status);
    task.setPriority(priority);
    tasks.save(task);
  }

  private void issue(User owner, LocalDate date, String title, IssueSeverity severity,
      IssueStatus status, String resolution) {
    IssueEntry issue = new IssueEntry(owner);
    issue.setEntryDate(date);
    issue.setTitle(title);
    issue.setSeverity(severity);
    issue.setResolutionNotes(resolution);
    issue.changeStatus(status, Instant.now());
    issues.save(issue);
  }

  private void feedback(User owner, LocalDate date, String subject, FeedbackType type,
      String details) {
    FeedbackEntry entry = new FeedbackEntry(owner);
    entry.setEntryDate(date);
    entry.setSubject(subject);
    entry.setType(type);
    entry.setDetails(details);
    feedback.save(entry);
  }

  private void note(User owner, LocalDate date, String title, String content, List<String> tags) {
    Note note = new Note(owner);
    note.setEntryDate(date);
    note.setTitle(title);
    note.setContent(content);
    note.replaceTags(tags);
    notes.save(note);
  }
}
