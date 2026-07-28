package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.SearchResponse;
import com.workshop.onboardingdiary.service.SearchService;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Global free-text search endpoint (REQUIREMENTS 9.4). {@code q} is required but is accepted as an
 * optional request parameter so a missing one is the same {@code $.errors.q} 400 as a blank one, and
 * any other parameter is ignored rather than rejected.
 */
@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public SearchResponse search(Principal principal,
                                 @RequestParam(name = "q", required = false) String q,
                                 @RequestParam(name = "userId", required = false) Long userId) {
        return searchService.search(principal.getName(), q, userId);
    }
}
