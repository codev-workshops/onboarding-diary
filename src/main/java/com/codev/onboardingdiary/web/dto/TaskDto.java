package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.Priority;
import com.codev.onboardingdiary.domain.TaskStatus;
import java.time.LocalDate;

public record TaskDto(Long id,
                      LocalDate date,
                      String title,
                      String description,
                      String category,
                      TaskStatus status,
                      Priority priority) {
}
