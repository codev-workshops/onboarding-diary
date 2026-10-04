package com.codev.onboardingdiary.manager;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Team dashboard for managers (and admins, across all recruits). */
@RestController
public class TeamDashboardController {

  private final ManagerService managerService;

  public TeamDashboardController(ManagerService managerService) {
    this.managerService = managerService;
  }

  @GetMapping("/api/dashboard/team")
  public TeamSummary team(@AuthenticationPrincipal AuthenticatedUser principal) {
    return managerService.team(principal);
  }
}
