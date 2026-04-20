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
public class TaskFilterParams {
    private TaskCategory category;
    private TaskStatus status;
    private Priority priority;
    private String dateFrom;
    private String dateTo;
}
