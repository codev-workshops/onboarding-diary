package com.codev.onboardingdiary.service;

public enum ReportType {
    TASKS,
    ISSUES,
    FEEDBACK,
    COMBINED;

    public boolean includesTasks() {
        return this == TASKS || this == COMBINED;
    }

    public boolean includesIssues() {
        return this == ISSUES || this == COMBINED;
    }

    public boolean includesFeedback() {
        return this == FEEDBACK || this == COMBINED;
    }
}
