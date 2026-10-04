package com.codev.onboardingdiary.issue;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record IssueStatusRequest(
    @NotNull IssueStatus status, @Size(max = 5000) String resolutionNotes) {}
