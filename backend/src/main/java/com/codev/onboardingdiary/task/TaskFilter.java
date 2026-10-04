package com.codev.onboardingdiary.task;

import java.time.LocalDate;
import java.util.List;

public record TaskFilter(
    LocalDate from,
    LocalDate to,
    List<TaskCategory> category,
    List<TaskStatus> status,
    TaskPriority priority,
    String q) {}
