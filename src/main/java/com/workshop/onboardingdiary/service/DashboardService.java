package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.DashboardResponse;
import com.workshop.onboardingdiary.dto.DashboardResponse.DashboardCounts;
import com.workshop.onboardingdiary.dto.DashboardResponse.TaskCompletion;
import com.workshop.onboardingdiary.dto.IssueResponse;
import com.workshop.onboardingdiary.dto.RecentEntryResponse;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.TaskStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dashboard aggregation for one user (REQUIREMENTS 4.6, US-R10, US-M03, decision D7): entry counts,
 * task completion over all time, the open issues and the 10 most recent entries.
 */
@Service
public class DashboardService {

    static final int RECENT_ENTRY_LIMIT = 10;

    private static final Set<IssueStatus> OPEN_ISSUE_STATUSES =
            EnumSet.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS);

    /** Latest entry date first, ties broken by the creation timestamp and finally by id. */
    private static final Comparator<RecentEntryResponse> RECENT_FIRST =
            Comparator.comparing(RecentEntryResponse::entryDate)
                    .thenComparing(RecentEntryResponse::createdAt)
                    .thenComparing(RecentEntryResponse::id)
                    .reversed();

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackNoteRepository feedbackNoteRepository;
    private final AdditionalNoteRepository additionalNoteRepository;
    private final EntryAccessService access;

    public DashboardService(TaskEntryRepository taskEntryRepository,
                           IssueEntryRepository issueEntryRepository,
                           FeedbackNoteRepository feedbackNoteRepository,
                           AdditionalNoteRepository additionalNoteRepository,
                           EntryAccessService access) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackNoteRepository = feedbackNoteRepository;
        this.additionalNoteRepository = additionalNoteRepository;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public DashboardResponse summary(String callerEmail, Long userId) {
        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        Long ownerId = owner.getId();

        long totalTasks = taskEntryRepository.countByOwnerId(ownerId);
        DashboardCounts counts = new DashboardCounts(totalTasks,
                issueEntryRepository.countByOwnerId(ownerId),
                feedbackNoteRepository.countByOwnerId(ownerId),
                additionalNoteRepository.countByOwnerId(ownerId));
        TaskCompletion completion = TaskCompletion.of(
                taskEntryRepository.countByOwnerIdAndStatus(ownerId, TaskStatus.COMPLETED), totalTasks);

        List<IssueResponse> openIssues =
                issueEntryRepository.findByOwnerIdAndStatusInOrderByEntryDateDescCreatedAtDescIdDesc(
                                ownerId, OPEN_ISSUE_STATUSES).stream()
                        .map(IssueResponse::from)
                        .toList();

        return new DashboardResponse(ownerId, counts, completion, openIssues, recentEntries(ownerId));
    }

    /**
     * The 10 most recent entries across all four types. Each type contributes at most 10 rows, which
     * is enough because the merged list is truncated to the same limit.
     */
    private List<RecentEntryResponse> recentEntries(Long ownerId) {
        Pageable latest = PageRequest.of(0, RECENT_ENTRY_LIMIT);
        Stream<RecentEntryResponse> entries = Stream.of(
                        taskEntryRepository.findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(ownerId, latest)
                                .stream().map(RecentEntryResponse::from),
                        issueEntryRepository.findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(ownerId, latest)
                                .stream().map(RecentEntryResponse::from),
                        feedbackNoteRepository.findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(ownerId, latest)
                                .stream().map(RecentEntryResponse::from),
                        additionalNoteRepository.findByOwnerIdOrderByEntryDateDescCreatedAtDescIdDesc(ownerId, latest)
                                .stream().map(RecentEntryResponse::from))
                .flatMap(stream -> stream);
        return entries.sorted(RECENT_FIRST).limit(RECENT_ENTRY_LIMIT).toList();
    }
}
