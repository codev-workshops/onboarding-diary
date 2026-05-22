package com.onboardingdiary.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SearchResponse {
    private List<SearchResult> results;
    private long totalResults;

    @Getter
    @Builder
    public static class SearchResult {
        private String id;
        private String type;
        private String title;
        private String description;
        private String date;
        private String highlight;
    }
}
