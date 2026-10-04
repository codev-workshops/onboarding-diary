package com.codev.onboardingdiary.search;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.dashboard.RecentEntry.EntryType;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@Tag(name = "Search")
public class SearchController {

  private final SearchService searchService;

  public SearchController(SearchService searchService) {
    this.searchService = searchService;
  }

  @GetMapping
  public SearchResults search(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam String q,
      @RequestParam(defaultValue = "SELF") SearchScope scope,
      @RequestParam(required = false) List<EntryType> type,
      @RequestParam(defaultValue = "10") int limit) {
    return searchService.search(principal, q, scope, type, limit);
  }
}
