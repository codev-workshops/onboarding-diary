package com.codev.onboardingdiary.web.api;

import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.DashboardService;
import com.codev.onboardingdiary.service.UserService;
import com.codev.onboardingdiary.web.dto.DashboardDto;
import com.codev.onboardingdiary.web.dto.DtoMapper;
import com.codev.onboardingdiary.web.dto.UserDto;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class MeApiController {

    private final UserService userService;
    private final DashboardService dashboardService;

    public MeApiController(UserService userService, DashboardService dashboardService) {
        this.userService = userService;
        this.dashboardService = dashboardService;
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AppUserDetails principal) {
        return DtoMapper.toDto(userService.getById(principal.getId()));
    }

    @GetMapping("/dashboard")
    public DashboardDto dashboard(@AuthenticationPrincipal AppUserDetails principal) {
        return dashboardService.forUser(principal, principal.getId());
    }
}
