package com.onboardingdiary.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Result envelope for a global-search query.
 */
public record SearchResponse(
        String query,
        int total,
        List<SearchResult> results
) {

    public record SearchResult(
            SearchEntityType type,
            long id,
            long ownerId,
            String title,
            String snippet,
            LocalDate date,
            Instant occurredAt,
            int score
    ) {
    }
}
