package com.codev.onboardingdiary.dashboard;

import com.codev.onboardingdiary.user.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** The logged-in recruit's own dashboard. */
@RestController
public class DashboardController {

  private final DashboardService service;
  private final CurrentUser currentUser;

  public DashboardController(DashboardService service, CurrentUser currentUser) {
    this.service = service;
    this.currentUser = currentUser;
  }

  @GetMapping("/api/dashboard")
  DashboardDto dashboard() {
    return service.forRecruit(currentUser.get());
  }
}
