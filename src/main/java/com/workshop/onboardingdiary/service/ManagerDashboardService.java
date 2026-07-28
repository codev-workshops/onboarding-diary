package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.ManagerDashboardResponse;
import com.workshop.onboardingdiary.dto.ManagerDashboardResponse.InactiveRecruit;
import com.workshop.onboardingdiary.dto.ManagerDashboardResponse.RecruitIssueSummary;
import com.workshop.onboardingdiary.dto.ManagerDashboardResponse.TeamCounts;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import com.workshop.onboardingdiary.repository.ManagerAssignmentRepository;
import com.workshop.onboardingdiary.repository.RecruitLastEntryDate;
import com.workshop.onboardingdiary.repository.RecruitOpenIssueCount;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Team-wide aggregation for one manager (REQUIREMENTS 10, US-MD01, US-MD02). The scope is the
 * recruits assigned through {@code manager_assignment}; the target manager is resolved by
 * {@link EntryAccessService#resolveManagerTarget}, so an out-of-scope or unknown id is a 403 rather
 * than a 404, and a manager with no recruits is a successful empty state.
 */
@Service
public class ManagerDashboardService {

    /** "Recently inactive" is no entry of any type within the last seven days (REQUIREMENTS 10, FD1). */
    static final int INACTIVITY_WINDOW_DAYS = 7;

    private static final Set<IssueSeverity> HIGH_PRIORITY =
            EnumSet.of(IssueSeverity.CRITICAL, IssueSeverity.HIGH);

    private static final Set<IssueStatus> OPEN_ISSUE_STATUSES =
            EnumSet.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS);

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackNoteRepository feedbackNoteRepository;
    private final AdditionalNoteRepository additionalNoteRepository;
    private final ManagerAssignmentRepository managerAssignmentRepository;
    private final UserRepository userRepository;
    private final EntryAccessService access;

    public ManagerDashboardService(TaskEntryRepository taskEntryRepository,
                                   IssueEntryRepository issueEntryRepository,
                                   FeedbackNoteRepository feedbackNoteRepository,
                                   AdditionalNoteRepository additionalNoteRepository,
                                   ManagerAssignmentRepository managerAssignmentRepository,
                                   UserRepository userRepository,
                                   EntryAccessService access) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackNoteRepository = feedbackNoteRepository;
        this.additionalNoteRepository = additionalNoteRepository;
        this.managerAssignmentRepository = managerAssignmentRepository;
        this.userRepository = userRepository;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public ManagerDashboardResponse summary(String callerEmail, Long managerId) {
        User caller = access.requireUser(callerEmail);
        User manager = access.resolveManagerTarget(caller, managerId);
        List<Long> recruitIds = managerAssignmentRepository.findRecruitIdsByManagerId(manager.getId());

        if (recruitIds.isEmpty()) {
            return new ManagerDashboardResponse(manager.getId(), 0,
                    new TeamCounts(0, 0, 0, 0), List.of(), List.of());
        }

        TeamCounts counts = new TeamCounts(
                taskEntryRepository.countByOwnerIdIn(recruitIds),
                issueEntryRepository.countByOwnerIdIn(recruitIds),
                feedbackNoteRepository.countByOwnerIdIn(recruitIds),
                additionalNoteRepository.countByOwnerIdIn(recruitIds));

        Map<Long, User> recruits = new HashMap<>();
        userRepository.findAllById(recruitIds).forEach(recruit -> recruits.put(recruit.getId(), recruit));

        List<RecruitIssueSummary> highPriority = highPriorityIssueList(recruitIds, recruits);
        List<InactiveRecruit> inactive = inactiveRecruitList(recruitIds, recruits);

        return new ManagerDashboardResponse(manager.getId(), recruitIds.size(), counts, highPriority, inactive);
    }

    private List<RecruitIssueSummary> highPriorityIssueList(List<Long> recruitIds, Map<Long, User> recruits) {
        Map<Long, Long> openByRecruit = new HashMap<>();
        for (RecruitOpenIssueCount row : issueEntryRepository
                .countOpenHighPriorityByRecruit(recruitIds, HIGH_PRIORITY, OPEN_ISSUE_STATUSES)) {
            openByRecruit.put(row.getRecruitId(), row.getOpenCount());
        }
        return recruitIds.stream()
                .filter(openByRecruit::containsKey)
                .map(id -> new RecruitIssueSummary(id, nameOf(recruits, id), openByRecruit.get(id)))
                .sorted(Comparator.comparing(RecruitIssueSummary::name, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(RecruitIssueSummary::userId))
                .toList();
    }

    private List<InactiveRecruit> inactiveRecruitList(List<Long> recruitIds, Map<Long, User> recruits) {
        Map<Long, LocalDate> lastEntry = new HashMap<>();
        mergeLatest(lastEntry, taskEntryRepository.findLastEntryDates(recruitIds));
        mergeLatest(lastEntry, issueEntryRepository.findLastEntryDates(recruitIds));
        mergeLatest(lastEntry, feedbackNoteRepository.findLastEntryDates(recruitIds));
        mergeLatest(lastEntry, additionalNoteRepository.findLastEntryDates(recruitIds));

        LocalDate cutoff = LocalDate.now().minusDays(INACTIVITY_WINDOW_DAYS);
        return recruitIds.stream()
                .filter(id -> {
                    LocalDate last = lastEntry.get(id);
                    return last == null || last.isBefore(cutoff);
                })
                .map(id -> new InactiveRecruit(id, nameOf(recruits, id), lastEntry.get(id)))
                .sorted(Comparator.comparing(InactiveRecruit::name, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(InactiveRecruit::userId))
                .toList();
    }

    private static void mergeLatest(Map<Long, LocalDate> target, List<RecruitLastEntryDate> rows) {
        for (RecruitLastEntryDate row : rows) {
            if (row.getLastEntryDate() != null) {
                target.merge(row.getRecruitId(), row.getLastEntryDate(),
                        (existing, candidate) -> candidate.isAfter(existing) ? candidate : existing);
            }
        }
    }

    private static String nameOf(Map<Long, User> recruits, Long id) {
        User recruit = recruits.get(id);
        return recruit == null ? null : recruit.getName();
    }
}
