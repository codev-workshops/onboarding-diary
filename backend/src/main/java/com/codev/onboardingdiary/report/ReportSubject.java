package com.codev.onboardingdiary.report;

import java.time.LocalDate;

/** A user whose diary is included in a report. */
public record ReportSubject(
    Long id,
    String fullName,
    String email,
    String department,
    LocalDate startDate,
    String managerName) {}
