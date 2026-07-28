package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.service.DepartmentService;
import com.workshop.onboardingdiary.service.ProfileService;
import java.security.Principal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Server-rendered pages (decision D5). The authenticated pages are shells around the existing REST
 * API: they only need the caller's profile for the shared navigation and its role gating, and the
 * data itself is fetched from {@code /api/**} by the page scripts.
 */
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
        return "redirect:/dashboard";
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

    @GetMapping("/dashboard")
    public String dashboard(Principal principal, Model model) {
        return page(principal, model, "dashboard");
    }

    @GetMapping("/manager-dashboard")
    public String managerDashboard(Principal principal, Model model) {
        return page(principal, model, "manager-dashboard");
    }

    @GetMapping("/tasks")
    public String tasks(Principal principal, Model model) {
        return page(principal, model, "tasks");
    }

    @GetMapping("/issues")
    public String issues(Principal principal, Model model) {
        return page(principal, model, "issues");
    }

    @GetMapping("/feedback")
    public String feedback(Principal principal, Model model) {
        return page(principal, model, "feedback");
    }

    @GetMapping("/notes")
    public String notes(Principal principal, Model model) {
        return page(principal, model, "notes");
    }

    @GetMapping("/reports")
    public String reports(Principal principal, Model model) {
        return page(principal, model, "reports");
    }

    @GetMapping("/search")
    public String search(Principal principal, Model model) {
        return page(principal, model, "search");
    }

    @GetMapping("/profile")
    public String profile(Principal principal, Model model) {
        model.addAttribute("departments", departmentService.list(true));
        return page(principal, model, "profile");
    }

    private String page(Principal principal, Model model, String view) {
        model.addAttribute("profile", profileService.getCurrentProfile(principal.getName()));
        return view;
    }
}
