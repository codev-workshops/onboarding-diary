package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.AdditionalNote;
import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.TaskEntry;
import java.time.Instant;
import java.time.LocalDate;

/** One line of the recent-entries list, describing an entry of any of the four types. */
public record RecentEntryResponse(EntryType type, Long id,
                                  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                                  LocalDate entryDate,
                                  String title,
                                  @JsonFormat(shape = JsonFormat.Shape.STRING) Instant createdAt) {

    public enum EntryType {
        TASK,
        ISSUE,
        FEEDBACK,
        NOTE
    }

    public static RecentEntryResponse from(TaskEntry task) {
        return new RecentEntryResponse(EntryType.TASK, task.getId(), task.getEntryDate(), task.getTitle(),
                task.getCreatedAt());
    }

    public static RecentEntryResponse from(IssueEntry issue) {
        return new RecentEntryResponse(EntryType.ISSUE, issue.getId(), issue.getEntryDate(), issue.getTitle(),
                issue.getCreatedAt());
    }

    public static RecentEntryResponse from(FeedbackNote feedback) {
        return new RecentEntryResponse(EntryType.FEEDBACK, feedback.getId(), feedback.getEntryDate(),
                feedback.getSubject(), feedback.getCreatedAt());
    }

    public static RecentEntryResponse from(AdditionalNote note) {
        return new RecentEntryResponse(EntryType.NOTE, note.getId(), note.getEntryDate(), note.getTitle(),
                note.getCreatedAt());
    }
}
