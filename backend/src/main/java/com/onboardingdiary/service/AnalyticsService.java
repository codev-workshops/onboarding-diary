package com.onboardingdiary.service;

import com.onboardingdiary.dto.response.AnalyticsResponse;
import com.onboardingdiary.enums.TaskStatus;
import com.onboardingdiary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final NoteRepository noteRepository;

    public AnalyticsResponse getAnalytics(UUID userId) {
        Map<String, Long> tasksByStatus = toMap(taskRepository.countByUserGroupByStatus(userId));
        Map<String, Long> tasksByCategory = toMap(taskRepository.countByUserGroupByCategory(userId));
        Map<String, Long> tasksByPriority = toMap(taskRepository.countByUserGroupByPriority(userId));
        Map<String, Long> issuesBySeverity = toMap(issueRepository.countByUserGroupBySeverity(userId));
        Map<String, Long> issuesByStatus = toMap(issueRepository.countByUserGroupByStatus(userId));
        Map<String, Long> feedbackByType = toMap(feedbackRepository.countByUserGroupByType(userId));

        long totalTasks = taskRepository.countByUserId(userId);
        long completedTasks = taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED);
        double completionRate = totalTasks > 0 ? (double) completedTasks / totalTasks * 100 : 0;

        long totalEntries = totalTasks
                + issueRepository.countByUserId(userId)
                + feedbackRepository.countByUserId(userId)
                + noteRepository.countByUserId(userId);

        LocalDate since = LocalDate.now().minusWeeks(12);
        List<AnalyticsResponse.WeeklyActivity> weeklyActivity = buildWeeklyActivity(userId, since);

        return AnalyticsResponse.builder()
                .tasksByStatus(tasksByStatus)
                .tasksByCategory(tasksByCategory)
                .tasksByPriority(tasksByPriority)
                .issuesBySeverity(issuesBySeverity)
                .issuesByStatus(issuesByStatus)
                .feedbackByType(feedbackByType)
                .weeklyActivity(weeklyActivity)
                .taskCompletionRate(completionRate)
                .totalEntries(totalEntries)
                .build();
    }

    private List<AnalyticsResponse.WeeklyActivity> buildWeeklyActivity(UUID userId, LocalDate since) {
        Map<String, Long> taskWeeks = toMapFromNative(taskRepository.countWeeklyActivity(userId, since));
        Map<String, Long> issueWeeks = toMapFromNative(issueRepository.countWeeklyActivity(userId, since));
        Map<String, Long> feedbackWeeks = toMapFromNative(feedbackRepository.countWeeklyActivity(userId, since));
        Map<String, Long> noteWeeks = toMapFromNative(noteRepository.countWeeklyActivity(userId, since));

        Set<String> allWeeks = new TreeSet<>();
        allWeeks.addAll(taskWeeks.keySet());
        allWeeks.addAll(issueWeeks.keySet());
        allWeeks.addAll(feedbackWeeks.keySet());
        allWeeks.addAll(noteWeeks.keySet());

        return allWeeks.stream()
                .map(week -> AnalyticsResponse.WeeklyActivity.builder()
                        .week(week)
                        .tasks(taskWeeks.getOrDefault(week, 0L))
                        .issues(issueWeeks.getOrDefault(week, 0L))
                        .feedback(feedbackWeeks.getOrDefault(week, 0L))
                        .notes(noteWeeks.getOrDefault(week, 0L))
                        .build())
                .collect(Collectors.toList());
    }

    private Map<String, Long> toMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> row[0].toString(),
                        row -> (Long) row[1],
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    private Map<String, Long> toMapFromNative(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> row[0].toString(),
                        row -> ((Number) row[1]).longValue(),
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }
}
