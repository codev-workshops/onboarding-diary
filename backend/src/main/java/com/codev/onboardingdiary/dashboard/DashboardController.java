package com.codev.onboardingdiary.dashboard;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own dashboard. */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  private final DashboardService service;

  public DashboardController(DashboardService service) {
    this.service = service;
  }

  @GetMapping("/summary")
  public DashboardSummary summary(@AuthenticationPrincipal AuthenticatedUser principal) {
    return service.summary(principal.id(), true);
  }

  @GetMapping("/recent")
  public List<RecentEntry> recent(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(defaultValue = "5") int limit) {
    return service.recent(principal.id(), limit, true);
  }
}
