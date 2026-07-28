package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.List;

/** Report contents for one recruit over a date range (REQUIREMENTS 4.7, US-R11, US-M04). */
public record ReportResponse(Long userId, String recruitName,
                             @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                             LocalDate dateFrom,
                             @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                             LocalDate dateTo,
                             int totalEntries,
                             List<TaskResponse> tasks, List<IssueResponse> issues,
                             List<FeedbackResponse> feedback, List<NoteResponse> notes) {

    public static ReportResponse of(Long userId, String recruitName, LocalDate dateFrom, LocalDate dateTo,
                                    List<TaskResponse> tasks, List<IssueResponse> issues,
                                    List<FeedbackResponse> feedback, List<NoteResponse> notes) {
        int total = tasks.size() + issues.size() + feedback.size() + notes.size();
        return new ReportResponse(userId, recruitName, dateFrom, dateTo, total, tasks, issues, feedback, notes);
    }
}
