package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.entity.TaskEntry;
import com.workshop.onboardingdiary.entity.TaskPriority;
import com.workshop.onboardingdiary.entity.TaskStatus;
import java.time.LocalDate;

public record TaskResponse(Long id, Long ownerId,
                           @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                           LocalDate entryDate,
                           String title, String description, String category,
                           TaskStatus status, TaskPriority priority) {

    public static TaskResponse from(TaskEntry task) {
        return new TaskResponse(task.getId(), task.getOwner().getId(), task.getEntryDate(), task.getTitle(),
                task.getDescription(), task.getCategory().getName(), task.getStatus(), task.getPriority());
    }
}
