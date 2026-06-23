package com.onboardingdiary.service;

import com.onboardingdiary.dto.DashboardResponse;
import com.onboardingdiary.entity.*;
import com.onboardingdiary.entity.enums.IssueStatus;
import com.onboardingdiary.entity.enums.Role;
import com.onboardingdiary.entity.enums.TaskStatus;
import com.onboardingdiary.repository.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackEntryRepository feedbackEntryRepository;
    private final NoteEntryRepository noteEntryRepository;
    private final UserRepository userRepository;
    private final ManagerRecruitAssignmentRepository assignmentRepository;

    public DashboardService(TaskEntryRepository taskEntryRepository,
                            IssueEntryRepository issueEntryRepository,
                            FeedbackEntryRepository feedbackEntryRepository,
                            NoteEntryRepository noteEntryRepository,
                            UserRepository userRepository,
                            ManagerRecruitAssignmentRepository assignmentRepository) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackEntryRepository = feedbackEntryRepository;
        this.noteEntryRepository = noteEntryRepository;
        this.userRepository = userRepository;
        this.assignmentRepository = assignmentRepository;
    }

    public DashboardResponse getRecruitDashboard(Long userId) {
        DashboardResponse response = new DashboardResponse();
        response.setTotalTasks(taskEntryRepository.countByUserId(userId));
        response.setCompletedTasks(taskEntryRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED));
        response.setTotalIssues(issueEntryRepository.countByUserId(userId));
        response.setOpenIssues(issueEntryRepository.countByUserIdAndStatus(userId, IssueStatus.OPEN));
        response.setTotalFeedback(feedbackEntryRepository.countByUserId(userId));
        response.setTotalNotes(noteEntryRepository.countByUserId(userId));

        List<Map<String, Object>> recentEntries = getRecentEntriesForUser(userId);
        response.setRecentEntries(recentEntries);

        return response;
    }

    public DashboardResponse getManagerDashboard(Long managerId) {
        DashboardResponse response = new DashboardResponse();

        List<ManagerRecruitAssignment> assignments = assignmentRepository.findByManagerId(managerId);
        List<Map<String, Object>> recruitSummaries = new ArrayList<>();
        long totalTasks = 0, completedTasks = 0, totalIssues = 0, openIssues = 0;

        for (ManagerRecruitAssignment assignment : assignments) {
            Long recruitId = assignment.getRecruit().getId();
            User recruit = assignment.getRecruit();

            long rTasks = taskEntryRepository.countByUserId(recruitId);
            long rCompleted = taskEntryRepository.countByUserIdAndStatus(recruitId, TaskStatus.COMPLETED);
            long rIssues = issueEntryRepository.countByUserId(recruitId);
            long rOpen = issueEntryRepository.countByUserIdAndStatus(recruitId, IssueStatus.OPEN);
            long rFeedback = feedbackEntryRepository.countByUserId(recruitId);
            long rNotes = noteEntryRepository.countByUserId(recruitId);

            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("recruitId", recruitId);
            summary.put("recruitName", recruit.getName());
            summary.put("department", recruit.getDepartment());
            summary.put("totalTasks", rTasks);
            summary.put("completedTasks", rCompleted);
            summary.put("totalIssues", rIssues);
            summary.put("openIssues", rOpen);
            summary.put("totalFeedback", rFeedback);
            summary.put("totalNotes", rNotes);
            recruitSummaries.add(summary);

            totalTasks += rTasks;
            completedTasks += rCompleted;
            totalIssues += rIssues;
            openIssues += rOpen;
        }

        response.setTotalTasks(totalTasks);
        response.setCompletedTasks(completedTasks);
        response.setTotalIssues(totalIssues);
        response.setOpenIssues(openIssues);
        response.setRecruitSummaries(recruitSummaries);

        return response;
    }

    public DashboardResponse getAdminDashboard() {
        DashboardResponse response = new DashboardResponse();

        List<User> allUsers = userRepository.findAll();
        Map<String, Long> countsByRole = allUsers.stream()
                .collect(Collectors.groupingBy(u -> u.getRole().name(), Collectors.counting()));
        response.setUserCountsByRole(countsByRole);

        long totalTasks = taskEntryRepository.count();
        long totalIssues = issueEntryRepository.count();
        long totalFeedback = feedbackEntryRepository.count();
        long totalNotes = noteEntryRepository.count();

        response.setTotalTasks(totalTasks);
        response.setTotalIssues(totalIssues);
        response.setTotalFeedback(totalFeedback);
        response.setTotalNotes(totalNotes);

        return response;
    }

    private List<Map<String, Object>> getRecentEntriesForUser(Long userId) {
        List<Map<String, Object>> recent = new ArrayList<>();

        taskEntryRepository.findByUserIdOrderByDateDesc(userId).stream().limit(5).forEach(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "task");
            item.put("id", e.getId());
            item.put("title", e.getTitle());
            item.put("date", e.getDate().toString());
            item.put("status", e.getStatus() != null ? e.getStatus().name() : null);
            recent.add(item);
        });

        issueEntryRepository.findByUserIdOrderByDateDesc(userId).stream().limit(5).forEach(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "issue");
            item.put("id", e.getId());
            item.put("title", e.getTitle());
            item.put("date", e.getDate().toString());
            item.put("status", e.getStatus() != null ? e.getStatus().name() : null);
            recent.add(item);
        });

        feedbackEntryRepository.findByUserIdOrderByDateDesc(userId).stream().limit(5).forEach(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "feedback");
            item.put("id", e.getId());
            item.put("title", e.getSubject());
            item.put("date", e.getDate().toString());
            item.put("feedbackType", e.getType() != null ? e.getType().name() : null);
            recent.add(item);
        });

        noteEntryRepository.findByUserIdOrderByDateDesc(userId).stream().limit(5).forEach(e -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", "note");
            item.put("id", e.getId());
            item.put("title", e.getTitle());
            item.put("date", e.getDate().toString());
            recent.add(item);
        });

        recent.sort((a, b) -> ((String) b.get("date")).compareTo((String) a.get("date")));

        return recent.stream().limit(5).toList();
    }
}
