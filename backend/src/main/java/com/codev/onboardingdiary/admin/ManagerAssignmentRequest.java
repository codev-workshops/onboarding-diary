package com.codev.onboardingdiary.admin;

/** Assigns the user to {@code managerId}, or removes the manager when it is null. */
public record ManagerAssignmentRequest(Long managerId) {}
