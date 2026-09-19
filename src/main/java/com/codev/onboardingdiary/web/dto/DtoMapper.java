package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.Note;
import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.User;

/** Converts entities into transport objects; entities never leave the service boundary. */
public final class DtoMapper {

    private DtoMapper() {
    }

    public static UserDto toDto(User user) {
        User manager = user.getManager();
        return new UserDto(user.getId(), user.getName(), user.getEmail(), user.getRole(),
                user.getDepartment(), user.getStartDate(), user.isActive(),
                manager == null ? null : manager.getId(),
                manager == null ? null : manager.getName());
    }

    public static TaskDto toDto(Task task) {
        return new TaskDto(task.getId(), task.getDate(), task.getTitle(), task.getDescription(),
                task.getCategory(), task.getStatus(), task.getPriority());
    }

    public static IssueDto toDto(Issue issue) {
        return new IssueDto(issue.getId(), issue.getDate(), issue.getTitle(), issue.getDescription(),
                issue.getSeverity(), issue.getStatus(), issue.getResolutionNotes());
    }

    public static FeedbackDto toDto(Feedback feedback) {
        return new FeedbackDto(feedback.getId(), feedback.getDate(), feedback.getSubject(),
                feedback.getType(), feedback.getDetails());
    }

    public static NoteDto toDto(Note note) {
        return new NoteDto(note.getId(), note.getDate(), note.getTitle(), note.getContent(), note.getTags());
    }
}
