package com.onboarding.diary.dto;

import com.onboarding.diary.entity.Priority;
import com.onboarding.diary.entity.TaskCategory;
import com.onboarding.diary.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private String id;
    private String userId;
    private String date;
    private String title;
    private String description;
    private TaskCategory category;
    private TaskStatus status;
    private Priority priority;
    private String createdAt;
    private String updatedAt;
}
