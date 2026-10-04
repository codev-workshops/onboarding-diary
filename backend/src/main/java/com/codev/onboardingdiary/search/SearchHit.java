package com.codev.onboardingdiary.search;

import com.codev.onboardingdiary.dashboard.RecentEntry.EntryType;
import java.time.LocalDate;

/**
 * One matching diary entry. {@code status} holds the task or issue status, the feedback type, or
 * null for notes; {@code snippet} is an excerpt of the body around the first match.
 */
public record SearchHit(
    EntryType type,
    Long id,
    Long ownerId,
    String ownerName,
    LocalDate entryDate,
    String title,
    String snippet,
    String status) {}
