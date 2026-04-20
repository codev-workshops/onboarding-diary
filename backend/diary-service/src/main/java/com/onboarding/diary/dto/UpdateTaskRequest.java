package com.onboarding.diary.dto;

import com.onboarding.diary.entity.Priority;
import com.onboarding.diary.entity.TaskCategory;
import com.onboarding.diary.entity.TaskStatus;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTaskRequest {

    private String date;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String description;

    private TaskCategory category;

    private TaskStatus status;

    private Priority priority;
}
