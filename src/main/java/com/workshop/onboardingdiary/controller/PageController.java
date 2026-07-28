package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.service.DepartmentService;
import com.workshop.onboardingdiary.service.ProfileService;
import java.security.Principal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/** Server-rendered pages (decision D5): login, sign up and profile. */
@Controller
public class PageController {

    private final ProfileService profileService;
    private final DepartmentService departmentService;

    public PageController(ProfileService profileService, DepartmentService departmentService) {
        this.profileService = profileService;
        this.departmentService = departmentService;
    }

    @GetMapping("/")
    public String home() {
        return "redirect:/profile";
    }

    @GetMapping("/login")
    public String login() {
        return "login";
    }

    @GetMapping("/signup")
    public String signup(Model model) {
        model.addAttribute("departments", departmentService.list(true));
        return "signup";
    }

    @GetMapping("/profile")
    public String profile(Principal principal, Model model) {
        model.addAttribute("profile", profileService.getCurrentProfile(principal.getName()));
        model.addAttribute("departments", departmentService.list(true));
        return "profile";
    }
}
