package com.codev.onboardingdiary.web.api;

import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.SearchService;
import com.codev.onboardingdiary.web.dto.SearchResultDto;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchApiController {

    private final SearchService searchService;

    public SearchApiController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public List<SearchResultDto> search(@AuthenticationPrincipal AppUserDetails principal,
                                        @RequestParam(required = false) String q) {
        return searchService.search(principal, principal.getId(), q);
    }
}
