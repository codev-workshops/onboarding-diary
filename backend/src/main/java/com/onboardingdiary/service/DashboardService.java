package com.onboardingdiary.service;

import com.onboardingdiary.dto.response.*;
import com.onboardingdiary.enums.IssueStatus;
import com.onboardingdiary.enums.TaskStatus;
import com.onboardingdiary.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TaskRepository taskRepository;
    private final IssueRepository issueRepository;
    private final FeedbackRepository feedbackRepository;
    private final NoteRepository noteRepository;

    public DashboardResponse getDashboard(UUID userId) {
        long totalTasks = taskRepository.countByUserId(userId);
        long completedTasks = taskRepository.countByUserIdAndStatus(userId, TaskStatus.COMPLETED);
        long openIssues = issueRepository.countByUserIdAndStatusIn(userId,
                List.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS));
        long totalFeedback = feedbackRepository.countByUserId(userId);
        long totalNotes = noteRepository.countByUserId(userId);

        double completionRate = totalTasks > 0 ? (double) completedTasks / totalTasks * 100 : 0;

        PageRequest top5 = PageRequest.of(0, 5);

        List<TaskResponse> recentTasks = taskRepository
                .findByUserWithFilters(userId, null, null, null, null, top5)
                .map(TaskResponse::from)
                .getContent();

        List<IssueResponse> recentIssues = issueRepository
                .findByUserWithFilters(userId, null, null, null, null, top5)
                .map(IssueResponse::from)
                .getContent();

        List<FeedbackResponse> recentFeedback = feedbackRepository
                .findByUserWithFilters(userId, null, null, null, top5)
                .map(FeedbackResponse::from)
                .getContent();

        List<NoteResponse> recentNotes = noteRepository
                .findByUserWithFilters(userId, null, null, top5)
                .map(NoteResponse::from)
                .getContent();

        return DashboardResponse.builder()
                .summary(DashboardResponse.SummaryResponse.builder()
                        .totalTasks(totalTasks)
                        .completedTasks(completedTasks)
                        .openIssues(openIssues)
                        .totalFeedback(totalFeedback)
                        .totalNotes(totalNotes)
                        .build())
                .recentTasks(recentTasks)
                .recentIssues(recentIssues)
                .recentFeedback(recentFeedback)
                .recentNotes(recentNotes)
                .taskCompletionRate(completionRate)
                .build();
    }

    public DashboardResponse getDashboardForUser(UUID userId) {
        return getDashboard(userId);
    }
}
