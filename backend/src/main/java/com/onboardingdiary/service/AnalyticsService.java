package com.onboardingdiary.service;

import com.onboardingdiary.dto.AnalyticsResponse;
import com.onboardingdiary.dto.AnalyticsResponse.ActivityVolumePoint;
import com.onboardingdiary.dto.AnalyticsResponse.TaskCompletionPoint;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.FeedbackType;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.TaskStatus;
import com.onboardingdiary.exception.ValidationException;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;

@Service
public class AnalyticsService {

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public AnalyticsService(TaskRepository taskRepository,
                            IssueRepository issueRepository,
                            FeedbackRepository feedbackRepository,
                            NoteRepository noteRepository,
                            UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.issueRepository = issueRepository;
        this.feedbackRepository = feedbackRepository;
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse load(AuthenticatedUser caller, LocalDate dateFrom, LocalDate dateTo) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ValidationException("dateFrom must not be after dateTo");
        }
        Set<Long> ownerIds = visibleOwnerIds(caller);

        List<Task> tasks = taskRepository.findAll(scope(ownerIds, dateFrom, dateTo));
        List<Issue> issues = issueRepository.findAll(scope(ownerIds, dateFrom, dateTo));
        List<Feedback> feedback = feedbackRepository.findAll(scope(ownerIds, dateFrom, dateTo));
        List<Note> notes = noteRepository.findAll(scope(ownerIds, dateFrom, dateTo));

        return new AnalyticsResponse(
                dateFrom,
                dateTo,
                taskCompletionTrend(tasks),
                severityDistribution(issues),
                statusDistribution(issues),
                feedbackTypeDistribution(feedback),
                activityVolumeTrend(tasks, issues, feedback, notes)
        );
    }

    private List<TaskCompletionPoint> taskCompletionTrend(List<Task> tasks) {
        Map<LocalDate, long[]> byDate = new LinkedHashMap<>();
        for (Task t : tasks) {
            long[] counts = byDate.computeIfAbsent(t.getDate(), d -> new long[2]);
            counts[0]++;
            if (t.getStatus() == TaskStatus.DONE) {
                counts[1]++;
            }
        }
        List<TaskCompletionPoint> points = new ArrayList<>();
        for (LocalDate date : new TreeSet<>(byDate.keySet())) {
            long total = byDate.get(date)[0];
            long completed = byDate.get(date)[1];
            double rate = total == 0 ? 0.0 : (double) completed / total;
            points.add(new TaskCompletionPoint(date, total, completed, rate));
        }
        return points;
    }

    private Map<String, Long> severityDistribution(List<Issue> issues) {
        Map<String, Long> dist = new LinkedHashMap<>();
        for (IssueSeverity severity : IssueSeverity.values()) {
            dist.put(severity.name(), 0L);
        }
        for (Issue i : issues) {
            dist.merge(i.getSeverity().name(), 1L, Long::sum);
        }
        return dist;
    }

    private Map<String, Long> statusDistribution(List<Issue> issues) {
        Map<String, Long> dist = new LinkedHashMap<>();
        for (IssueStatus status : IssueStatus.values()) {
            dist.put(status.name(), 0L);
        }
        for (Issue i : issues) {
            dist.merge(i.getStatus().name(), 1L, Long::sum);
        }
        return dist;
    }

    private Map<String, Long> feedbackTypeDistribution(List<Feedback> feedback) {
        Map<String, Long> dist = new LinkedHashMap<>();
        for (FeedbackType type : FeedbackType.values()) {
            dist.put(type.name(), 0L);
        }
        for (Feedback f : feedback) {
            dist.merge(f.getType().name(), 1L, Long::sum);
        }
        return dist;
    }

    private List<ActivityVolumePoint> activityVolumeTrend(List<Task> tasks, List<Issue> issues,
                                                          List<Feedback> feedback, List<Note> notes) {
        Map<LocalDate, long[]> byDate = new LinkedHashMap<>();
        tally(byDate, tasks, Task::getDate, 0);
        tally(byDate, issues, Issue::getDate, 1);
        tally(byDate, feedback, Feedback::getDate, 2);
        tally(byDate, notes, Note::getDate, 3);

        List<ActivityVolumePoint> points = new ArrayList<>();
        for (LocalDate date : new TreeSet<>(byDate.keySet())) {
            long[] c = byDate.get(date);
            long total = c[0] + c[1] + c[2] + c[3];
            points.add(new ActivityVolumePoint(date, c[0], c[1], c[2], c[3], total));
        }
        return points;
    }

    private <T> void tally(Map<LocalDate, long[]> byDate, List<T> items,
                           Function<T, LocalDate> dateGetter, int slot) {
        for (T item : items) {
            byDate.computeIfAbsent(dateGetter.apply(item), d -> new long[4])[slot]++;
        }
    }

    private <T> Specification<T> scope(Set<Long> ownerIds, LocalDate dateFrom, LocalDate dateTo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (ownerIds != null) {
                predicates.add(root.get("ownerId").in(ownerIds));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), dateFrom));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), dateTo));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Set<Long> visibleOwnerIds(AuthenticatedUser caller) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return null;
        }
        Set<Long> ids = new HashSet<>();
        ids.add(caller.id());
        if (role == Role.MANAGER) {
            ids.addAll(userRepository.findIdsByManagerId(caller.id()));
        }
        return ids;
    }
}
