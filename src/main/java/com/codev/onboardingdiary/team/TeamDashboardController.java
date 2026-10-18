package com.codev.onboardingdiary.team;

import com.codev.onboardingdiary.user.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Team dashboard for managers and admins; access enforced in {@code SecurityConfig}. */
@RestController
public class TeamDashboardController {

  private final TeamDashboardService service;
  private final CurrentUser currentUser;

  public TeamDashboardController(TeamDashboardService service, CurrentUser currentUser) {
    this.service = service;
    this.currentUser = currentUser;
  }

  @GetMapping("/api/team-dashboard")
  TeamDashboardDto dashboard() {
    return service.forViewer(currentUser.get());
  }
}
