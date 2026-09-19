package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.TaskStatus;
import java.time.LocalDate;

public record TaskFilter(LocalDate from, LocalDate to, String category, TaskStatus status) {

    public static TaskFilter empty() {
        return new TaskFilter(null, null, null, null);
    }
}
