package com.workshop.onboardingdiary.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.workshop.onboardingdiary.dto.RecentEntryResponse.EntryType;
import java.time.LocalDate;
import java.util.List;

/**
 * Grouped free-text search results for one user (REQUIREMENTS 9.4). Every group is always present,
 * empty when nothing matched, so clients need no null handling.
 */
public record SearchResponse(String query, Long userId, int totalResults, SearchResults results) {

    /** The four entry types, in the order the results page renders them. */
    public record SearchResults(SearchGroup tasks, SearchGroup issues, SearchGroup feedback, SearchGroup notes) {
    }

    /** One entry type's hits, with its count and whether the per-group cap dropped rows. */
    public record SearchGroup(int count, boolean truncated, List<SearchHit> items) {
    }

    /** One matching entry: the same headline shape for all four types, plus a plain-text excerpt. */
    public record SearchHit(EntryType type, Long id,
                            @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
                            LocalDate entryDate,
                            String title, String excerpt) {
    }
}
