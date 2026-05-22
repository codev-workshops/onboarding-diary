package com.onboardingdiary.dto.response;

import com.onboardingdiary.entity.Task;
import com.onboardingdiary.enums.TaskCategory;
import com.onboardingdiary.enums.TaskPriority;
import com.onboardingdiary.enums.TaskStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class TaskResponse {
    private UUID id;
    private UUID userId;
    private LocalDate date;
    private String title;
    private String description;
    private TaskCategory category;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TaskResponse from(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .userId(task.getUser().getId())
                .date(task.getDate())
                .title(task.getTitle())
                .description(task.getDescription())
                .category(task.getCategory())
                .status(task.getStatus())
                .priority(task.getPriority())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
