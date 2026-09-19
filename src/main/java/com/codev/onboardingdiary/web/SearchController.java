package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.SearchService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/search")
    public String search(@AuthenticationPrincipal AppUserDetails principal,
                         @RequestParam(required = false) String q,
                         Model model) {
        model.addAttribute("q", q);
        model.addAttribute("results", searchService.search(principal, principal.getId(), q));
        return "search";
    }
}
