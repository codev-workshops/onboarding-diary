package com.onboardingdiary.controller;

import com.onboardingdiary.dto.SearchEntityType;
import com.onboardingdiary.dto.SearchResponse;
import com.onboardingdiary.dto.SearchSort;
import com.onboardingdiary.security.CurrentUser;
import com.onboardingdiary.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/search")
@Tag(name = "Search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    @Operation(summary = "Global keyword search across tasks, issues, feedback and notes (RBAC-scoped)")
    public SearchResponse search(
            @RequestParam(name = "q") String q,
            @RequestParam(name = "types", required = false) List<SearchEntityType> types,
            @RequestParam(name = "sort", defaultValue = "RELEVANCE") SearchSort sort) {
        Set<SearchEntityType> typeSet = types == null ? null : new HashSet<>(types);
        return searchService.search(CurrentUser.require(), q, typeSet, sort);
    }
}
