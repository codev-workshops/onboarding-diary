package com.codev.onboardingdiary.recruit;

import com.codev.onboardingdiary.user.UserRef;
import java.time.LocalDate;

/** One row of the "My recruits" table; {@code taskPercent} is null without tasks. */
public record RecruitSummaryDto(
    Long id,
    String name,
    String email,
    String department,
    LocalDate startDate,
    UserRef manager,
    boolean active,
    long openIssues,
    Double taskPercent) {}
