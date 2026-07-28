package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.util.List;

/**
 * Team-wide aggregate dashboard for one manager (REQUIREMENTS 10, US-MD01, US-MD02): counts across
 * every recruit the manager oversees, plus the two attention lists. A manager with no assigned
 * recruits is a successful empty state, not an error: {@code teamSize} 0, zero counts and empty
 * lists.
 */
public record ManagerDashboardResponse(Long managerId, int teamSize, TeamCounts counts,
                                       List<RecruitIssueSummary> recruitsWithOpenHighPriorityIssues,
                                       List<InactiveRecruit> inactiveRecruits) {

    /** Entry counts summed across the whole team. */
    public record TeamCounts(long tasks, long issues, long feedbackNotes, long additionalNotes) {
    }

    /** A recruit who still has open CRITICAL/HIGH issues, with how many. */
    public record RecruitIssueSummary(Long userId, String name, long openCriticalOrHigh) {
    }

    /**
     * A recruit with no entry of any type in the last seven days; {@code lastEntryDate} is null when
     * the recruit has never logged an entry.
     */
    public record InactiveRecruit(Long userId, String name,
                                  @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                                  LocalDate lastEntryDate) {
    }
}
