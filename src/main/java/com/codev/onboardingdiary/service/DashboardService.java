package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.EntryCategory;
import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Note;
import com.codev.onboardingdiary.domain.Priority;
import com.codev.onboardingdiary.domain.Severity;
import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.IssueRepository;
import com.codev.onboardingdiary.repository.TaskRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.DashboardDto;
import com.codev.onboardingdiary.web.dto.FeedbackFilter;
import com.codev.onboardingdiary.web.dto.IssueFilter;
import com.codev.onboardingdiary.web.dto.NoteFilter;
import com.codev.onboardingdiary.web.dto.RecentEntryDto;
import com.codev.onboardingdiary.web.dto.RecruitSummaryDto;
import com.codev.onboardingdiary.web.dto.TaskFilter;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    /** A task still open this many days after its entry date is highlighted as overdue. */
    public static final int OVERDUE_AFTER_DAYS = 7;

    private static final int RECENT_ENTRY_LIMIT = 8;

    private final TaskService taskService;
    private final IssueService issueService;
    private final FeedbackService feedbackService;
    private final NoteService noteService;
    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final AuthorizationService authorizationService;
    private final UserService userService;

    public DashboardService(TaskService taskService,
                            IssueService issueService,
                            FeedbackService feedbackService,
                            NoteService noteService,
                            TaskRepository taskRepository,
                            IssueRepository issueRepository,
                            AuthorizationService authorizationService,
                            UserService userService) {
        this.taskService = taskService;
        this.issueService = issueService;
        this.feedbackService = feedbackService;
        this.noteService = noteService;
        this.taskRepository = taskRepository;
        this.issueRepository = issueRepository;
        this.authorizationService = authorizationService;
        this.userService = userService;
    }

    public DashboardDto forUser(AppUserDetails principal, Long ownerId) {
        authorizationService.requireReadAccess(principal, ownerId);
        List<Task> tasks = taskService.listForOwner(ownerId, TaskFilter.empty());
        List<Issue> issues = issueService.listForOwner(ownerId, IssueFilter.empty());
        List<Feedback> feedback = feedbackService.listForOwner(ownerId, FeedbackFilter.empty());
        List<Note> notes = noteService.listForOwner(ownerId, NoteFilter.empty());

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
        long openIssues = issues.stream()
                .filter(i -> IssueService.OPEN_STATUSES.contains(i.getStatus()))
                .count();
        LocalDate overdueBefore = LocalDate.now().minusDays(OVERDUE_AFTER_DAYS);
        long overdueTasks = tasks.stream()
                .filter(t -> t.getStatus() != TaskStatus.COMPLETED && t.getDate().isBefore(overdueBefore))
                .count();

        Map<String, Long> tasksByStatus = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            tasksByStatus.put(status.name(), tasks.stream().filter(t -> t.getStatus() == status).count());
        }
        Map<String, Long> issuesBySeverity = new LinkedHashMap<>();
        for (Severity severity : Severity.values()) {
            issuesBySeverity.put(severity.name(), issues.stream().filter(i -> i.getSeverity() == severity).count());
        }

        return new DashboardDto(totalTasks, completedTasks, completionPercentage(totalTasks, completedTasks),
                openIssues, feedback.size(), notes.size(), overdueTasks, tasksByStatus, issuesBySeverity,
                recentEntries(tasks, issues, feedback, notes));
    }

    /** Per-recruit rollup used by the manager and admin views. */
    public List<RecruitSummaryDto> recruitSummaries(AppUserDetails principal) {
        List<User> recruits = userService.findViewableRecruits(principal);
        List<RecruitSummaryDto> summaries = new ArrayList<>();
        for (User recruit : recruits) {
            long total = taskService.countAll(recruit.getId());
            long completed = taskService.countByStatus(recruit.getId(), TaskStatus.COMPLETED);
            long openIssues = issueService.countOpen(recruit.getId());
            LocalDate lastActivity = lastActivity(recruit.getId());
            summaries.add(new RecruitSummaryDto(recruit.getId(), recruit.getName(), recruit.getEmail(),
                    recruit.getDepartment(), total, completed, completionPercentage(total, completed),
                    openIssues, lastActivity == null ? "-" : lastActivity.toString()));
        }
        return summaries;
    }

    /** Team-wide chart data for the manager dashboard. */
    public Map<String, Long> teamTasksByStatus(List<Long> recruitIds) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            counts.put(status.name(), 0L);
        }
        if (recruitIds.isEmpty()) {
            return counts;
        }
        for (Object[] row : taskRepository.countByStatusForUsers(recruitIds)) {
            counts.put(((TaskStatus) row[0]).name(), (Long) row[1]);
        }
        return counts;
    }

    public Map<String, Long> teamIssuesBySeverity(List<Long> recruitIds) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Severity severity : Severity.values()) {
            counts.put(severity.name(), 0L);
        }
        if (recruitIds.isEmpty()) {
            return counts;
        }
        for (Object[] row : issueRepository.countBySeverityForUsers(recruitIds)) {
            counts.put(((Severity) row[0]).name(), (Long) row[1]);
        }
        return counts;
    }

    public long teamOpenIssues(List<Long> recruitIds) {
        if (recruitIds.isEmpty()) {
            return 0;
        }
        return issueRepository.countByUsersAndStatuses(recruitIds, IssueService.OPEN_STATUSES);
    }

    public static int completionPercentage(long total, long completed) {
        if (total <= 0) {
            return 0;
        }
        return (int) Math.round(completed * 100.0 / total);
    }

    private LocalDate lastActivity(Long userId) {
        return recentEntries(taskService.listForOwner(userId, TaskFilter.empty()),
                issueService.listForOwner(userId, IssueFilter.empty()),
                feedbackService.listForOwner(userId, FeedbackFilter.empty()),
                noteService.listForOwner(userId, NoteFilter.empty()))
                .stream()
                .map(RecentEntryDto::date)
                .findFirst()
                .orElse(null);
    }

    private List<RecentEntryDto> recentEntries(List<Task> tasks,
                                               List<Issue> issues,
                                               List<Feedback> feedback,
                                               List<Note> notes) {
        List<RecentEntryDto> entries = new ArrayList<>();
        for (Task task : tasks) {
            entries.add(new RecentEntryDto(EntryCategory.TASK, task.getId(), task.getDate(), task.getTitle(),
                    task.getStatus().name() + " / " + priorityLabel(task.getPriority()),
                    "/tasks/edit/" + task.getId()));
        }
        for (Issue issue : issues) {
            entries.add(new RecentEntryDto(EntryCategory.ISSUE, issue.getId(), issue.getDate(), issue.getTitle(),
                    issue.getStatus().name() + " / " + severityLabel(issue.getSeverity()),
                    "/issues/edit/" + issue.getId()));
        }
        for (Feedback item : feedback) {
            entries.add(new RecentEntryDto(EntryCategory.FEEDBACK, item.getId(), item.getDate(), item.getSubject(),
                    item.getType().name(), "/feedback/edit/" + item.getId()));
        }
        for (Note note : notes) {
            entries.add(new RecentEntryDto(EntryCategory.NOTE, note.getId(), note.getDate(), note.getTitle(),
                    note.getTags() == null ? "" : note.getTags(), "/notes/edit/" + note.getId()));
        }
        entries.sort(Comparator.comparing(RecentEntryDto::date).reversed()
                .thenComparing(RecentEntryDto::id, Comparator.reverseOrder()));
        return entries.size() > RECENT_ENTRY_LIMIT ? entries.subList(0, RECENT_ENTRY_LIMIT) : entries;
    }

    private static String priorityLabel(Priority priority) {
        return priority == null ? "" : priority.name();
    }

    private static String severityLabel(Severity severity) {
        return severity == null ? "" : severity.name();
    }

    static boolean isOpen(IssueStatus status) {
        return IssueService.OPEN_STATUSES.contains(status);
    }
}
