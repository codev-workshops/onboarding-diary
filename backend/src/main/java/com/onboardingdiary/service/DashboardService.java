package com.onboardingdiary.service;

import com.onboardingdiary.dto.DashboardResponse;
import com.onboardingdiary.dto.DashboardResponse.ActivityItem;
import com.onboardingdiary.dto.DashboardResponse.IssueMetrics;
import com.onboardingdiary.dto.DashboardResponse.Summary;
import com.onboardingdiary.dto.DashboardResponse.TaskMetrics;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.entity.TaskStatus;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DashboardService {

    private static final int RECENT_PER_TYPE = 5;
    private static final int RECENT_TOTAL = 10;

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public DashboardService(TaskRepository taskRepository,
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
    public DashboardResponse load(AuthenticatedUser caller) {
        Set<Long> ownerIds = visibleOwnerIds(caller);

        Summary summary = new Summary(
                taskRepository.count(this.<Task>owned(ownerIds)),
                issueRepository.count(this.<Issue>owned(ownerIds)),
                feedbackRepository.count(this.<Feedback>owned(ownerIds)),
                noteRepository.count(this.<Note>owned(ownerIds))
        );

        return new DashboardResponse(
                summary,
                taskMetrics(ownerIds),
                issueMetrics(ownerIds),
                recentActivity(ownerIds)
        );
    }

    private TaskMetrics taskMetrics(Set<Long> ownerIds) {
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            byStatus.put(status.name(),
                    taskRepository.count(this.<Task>owned(ownerIds).and(hasEnum("status", status))));
        }
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long completed = byStatus.getOrDefault(TaskStatus.DONE.name(), 0L);
        double rate = total == 0 ? 0.0 : (double) completed / total;
        return new TaskMetrics(total, completed, rate, byStatus);
    }

    private IssueMetrics issueMetrics(Set<Long> ownerIds) {
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (IssueStatus status : IssueStatus.values()) {
            byStatus.put(status.name(),
                    issueRepository.count(this.<Issue>owned(ownerIds).and(hasEnum("status", status))));
        }
        Map<String, Long> bySeverity = new LinkedHashMap<>();
        for (IssueSeverity severity : IssueSeverity.values()) {
            bySeverity.put(severity.name(),
                    issueRepository.count(this.<Issue>owned(ownerIds).and(hasEnum("severity", severity))));
        }
        long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
        long open = byStatus.getOrDefault(IssueStatus.OPEN.name(), 0L)
                + byStatus.getOrDefault(IssueStatus.IN_PROGRESS.name(), 0L);
        return new IssueMetrics(total, open, byStatus, bySeverity);
    }

    private List<ActivityItem> recentActivity(Set<Long> ownerIds) {
        PageRequest recent = PageRequest.of(0, RECENT_PER_TYPE,
                Sort.by(Sort.Direction.DESC, "updatedAt"));

        List<ActivityItem> items = new java.util.ArrayList<>();

        taskRepository.findAll(this.<Task>owned(ownerIds), recent).forEach(t ->
                items.add(new ActivityItem("TASK", t.getId(), t.getOwnerId(), t.getTitle(), t.getDate(), t.getUpdatedAt())));
        issueRepository.findAll(this.<Issue>owned(ownerIds), recent).forEach(i ->
                items.add(new ActivityItem("ISSUE", i.getId(), i.getOwnerId(), i.getTitle(), i.getDate(), i.getUpdatedAt())));
        feedbackRepository.findAll(this.<Feedback>owned(ownerIds), recent).forEach(f ->
                items.add(new ActivityItem("FEEDBACK", f.getId(), f.getOwnerId(), f.getSubject(), f.getDate(), f.getUpdatedAt())));
        noteRepository.findAll(this.<Note>owned(ownerIds), recent).forEach(n ->
                items.add(new ActivityItem("NOTE", n.getId(), n.getOwnerId(), n.getTitle(), n.getDate(), n.getUpdatedAt())));

        return items.stream()
                .sorted(Comparator.comparing(ActivityItem::occurredAt).reversed())
                .limit(RECENT_TOTAL)
                .toList();
    }

    /** Restricts a query to the visible owners, or no restriction for admin ({@code null}). */
    private <T> Specification<T> owned(Set<Long> ownerIds) {
        return (root, query, cb) -> {
            if (ownerIds == null) {
                return cb.conjunction();
            }
            return root.get("ownerId").in(ownerIds);
        };
    }

    private <T> Specification<T> hasEnum(String attribute, Enum<?> value) {
        return (root, query, cb) -> cb.equal(root.get(attribute), value);
    }

    /**
     * The set of owner ids the caller may view, or {@code null} for unrestricted
     * (admin) access. Mirrors the per-resource service scoping.
     */
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
