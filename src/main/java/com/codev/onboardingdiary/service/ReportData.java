package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.Task;
import java.time.LocalDate;
import java.util.List;

public record ReportData(String userName,
                         String userEmail,
                         LocalDate from,
                         LocalDate to,
                         ReportType type,
                         List<Task> tasks,
                         List<Issue> issues,
                         List<Feedback> feedback) {
}
