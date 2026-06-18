package com.onboardingdiary.service;

import com.onboardingdiary.dto.ReportData;
import com.onboardingdiary.dto.ReportData.Section;
import com.onboardingdiary.dto.ReportType;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.Task;
import com.onboardingdiary.exception.ValidationException;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.IssueRepository;
import com.onboardingdiary.repository.TaskRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ReportService {

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    public ReportService(TaskRepository taskRepository,
                         IssueRepository issueRepository,
                         FeedbackRepository feedbackRepository,
                         UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.issueRepository = issueRepository;
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ReportData generate(AuthenticatedUser caller, ReportType type,
                               LocalDate dateFrom, LocalDate dateTo, Long ownerId) {
        if (dateFrom != null && dateTo != null && dateFrom.isAfter(dateTo)) {
            throw new ValidationException("dateFrom must not be after dateTo");
        }

        Set<Long> allowedOwnerIds = visibleOwnerIds(caller);
        if (ownerId != null && allowedOwnerIds != null && !allowedOwnerIds.contains(ownerId)) {
            throw new AccessDeniedException("Not allowed to report on this user's data");
        }

        List<Section> sections = new ArrayList<>();
        if (type == ReportType.TASKS || type == ReportType.COMBINED) {
            sections.add(taskSection(allowedOwnerIds, ownerId, dateFrom, dateTo));
        }
        if (type == ReportType.ISSUES || type == ReportType.COMBINED) {
            sections.add(issueSection(allowedOwnerIds, ownerId, dateFrom, dateTo));
        }
        if (type == ReportType.FEEDBACK || type == ReportType.COMBINED) {
            sections.add(feedbackSection(allowedOwnerIds, ownerId, dateFrom, dateTo));
        }

        return new ReportData(titleFor(type), dateFrom, dateTo, Instant.now(), sections);
    }

    private Section taskSection(Set<Long> allowed, Long ownerId, LocalDate from, LocalDate to) {
        List<Task> tasks = taskRepository.findAll(
                this.<Task>scope(allowed, ownerId, from, to), dateDesc());
        List<List<String>> rows = new ArrayList<>();
        for (Task t : tasks) {
            rows.add(List.of(
                    str(t.getDate()), str(t.getOwnerId()), nz(t.getTitle()),
                    str(t.getCategory()), str(t.getStatus()), str(t.getPriority()),
                    nz(t.getDescription())));
        }
        return new Section("Tasks",
                List.of("Date", "Owner", "Title", "Category", "Status", "Priority", "Description"), rows);
    }

    private Section issueSection(Set<Long> allowed, Long ownerId, LocalDate from, LocalDate to) {
        List<Issue> issues = issueRepository.findAll(
                this.<Issue>scope(allowed, ownerId, from, to), dateDesc());
        List<List<String>> rows = new ArrayList<>();
        for (Issue i : issues) {
            rows.add(List.of(
                    str(i.getDate()), str(i.getOwnerId()), nz(i.getTitle()),
                    str(i.getSeverity()), str(i.getStatus()), nz(i.getResolutionNotes()),
                    nz(i.getDescription())));
        }
        return new Section("Issues",
                List.of("Date", "Owner", "Title", "Severity", "Status", "Resolution notes", "Description"), rows);
    }

    private Section feedbackSection(Set<Long> allowed, Long ownerId, LocalDate from, LocalDate to) {
        List<Feedback> feedback = feedbackRepository.findAll(
                this.<Feedback>scope(allowed, ownerId, from, to), dateDesc());
        List<List<String>> rows = new ArrayList<>();
        for (Feedback f : feedback) {
            rows.add(List.of(
                    str(f.getDate()), str(f.getOwnerId()), nz(f.getSubject()),
                    str(f.getType()), nz(f.getDetails())));
        }
        return new Section("Feedback",
                List.of("Date", "Owner", "Subject", "Type", "Details"), rows);
    }

    private <T> Specification<T> scope(Set<Long> allowed, Long ownerId, LocalDate from, LocalDate to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (ownerId != null) {
                predicates.add(cb.equal(root.get("ownerId"), ownerId));
            } else if (allowed != null) {
                predicates.add(root.get("ownerId").in(allowed));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort dateDesc() {
        return Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id"));
    }

    private String titleFor(ReportType type) {
        return switch (type) {
            case TASKS -> "Tasks Report";
            case ISSUES -> "Issues Report";
            case FEEDBACK -> "Feedback Report";
            case COMBINED -> "Combined Report";
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

    private String nz(String value) {
        return value == null ? "" : value;
    }

    private String str(Object value) {
        return value == null ? "" : value.toString();
    }
}
