package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.EmailAlreadyUsedException;
import com.codev.onboardingdiary.service.UserService;
import com.codev.onboardingdiary.web.dto.AdminUserForm;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public String users(@AuthenticationPrincipal AppUserDetails principal, Model model) {
        if (!model.containsAttribute("adminUserForm")) {
            model.addAttribute("adminUserForm", new AdminUserForm());
        }
        model.addAttribute("users", userService.findAll(principal));
        model.addAttribute("managers", userService.findManagers());
        model.addAttribute("roles", Role.values());
        return "admin/users";
    }

    @PostMapping("/users")
    public String createUser(@AuthenticationPrincipal AppUserDetails principal,
                             @Valid @ModelAttribute("adminUserForm") AdminUserForm form,
                             BindingResult bindingResult,
                             Model model,
                             RedirectAttributes redirectAttributes) {
        if (!bindingResult.hasErrors()) {
            try {
                userService.createByAdmin(principal, form);
                redirectAttributes.addFlashAttribute("successMessage", "User created");
                return "redirect:/admin/users";
            } catch (EmailAlreadyUsedException ex) {
                bindingResult.addError(new FieldError("adminUserForm", "email", ex.getMessage()));
            } catch (IllegalArgumentException ex) {
                bindingResult.addError(new FieldError("adminUserForm", "managerId", ex.getMessage()));
            }
        }
        model.addAttribute("users", userService.findAll(principal));
        model.addAttribute("managers", userService.findManagers());
        model.addAttribute("roles", Role.values());
        return "admin/users";
    }

    @PostMapping("/users/{id}/active")
    public String setActive(@AuthenticationPrincipal AppUserDetails principal,
                            @PathVariable Long id,
                            @RequestParam boolean active,
                            RedirectAttributes redirectAttributes) {
        try {
            userService.setActive(principal, id, active);
            redirectAttributes.addFlashAttribute("successMessage",
                    active ? "User activated" : "User deactivated");
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/admin/users";
    }

    @PostMapping("/users/{id}/manager")
    public String assignManager(@AuthenticationPrincipal AppUserDetails principal,
                                @PathVariable Long id,
                                @RequestParam(required = false) Long managerId,
                                RedirectAttributes redirectAttributes) {
        try {
            userService.assignManager(principal, id, managerId);
            redirectAttributes.addFlashAttribute("successMessage", "Manager assignment updated");
        } catch (IllegalArgumentException ex) {
            redirectAttributes.addFlashAttribute("errorMessage", ex.getMessage());
        }
        return "redirect:/admin/users";
    }
}
