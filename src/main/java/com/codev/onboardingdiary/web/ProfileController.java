package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.UserService;
import com.codev.onboardingdiary.web.dto.PasswordChangeForm;
import com.codev.onboardingdiary.web.dto.ProfileForm;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class ProfileController {

    private final UserService userService;

    public ProfileController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public String profile(@AuthenticationPrincipal AppUserDetails principal, Model model) {
        User user = userService.getById(principal.getId());
        if (!model.containsAttribute("profileForm")) {
            ProfileForm form = new ProfileForm();
            form.setName(user.getName());
            form.setDepartment(user.getDepartment());
            form.setStartDate(user.getStartDate());
            model.addAttribute("profileForm", form);
        }
        if (!model.containsAttribute("passwordChangeForm")) {
            model.addAttribute("passwordChangeForm", new PasswordChangeForm());
        }
        model.addAttribute("profile", user);
        return "profile";
    }

    @PostMapping("/profile")
    public String updateProfile(@AuthenticationPrincipal AppUserDetails principal,
                                @Valid @ModelAttribute("profileForm") ProfileForm form,
                                BindingResult bindingResult,
                                Model model,
                                RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("profile", userService.getById(principal.getId()));
            model.addAttribute("passwordChangeForm", new PasswordChangeForm());
            return "profile";
        }
        userService.updateProfile(principal, form);
        redirectAttributes.addFlashAttribute("successMessage", "Profile updated");
        return "redirect:/profile";
    }

    @PostMapping("/profile/password")
    public String changePassword(@AuthenticationPrincipal AppUserDetails principal,
                                 @Valid @ModelAttribute("passwordChangeForm") PasswordChangeForm form,
                                 BindingResult bindingResult,
                                 Model model,
                                 RedirectAttributes redirectAttributes) {
        if (!bindingResult.hasErrors()) {
            try {
                userService.changePassword(principal, form.getCurrentPassword(), form.getNewPassword());
                redirectAttributes.addFlashAttribute("successMessage", "Password changed");
                return "redirect:/profile";
            } catch (IllegalArgumentException ex) {
                bindingResult.addError(new FieldError("passwordChangeForm", "currentPassword", ex.getMessage()));
            }
        }
        User user = userService.getById(principal.getId());
        ProfileForm profileForm = new ProfileForm();
        profileForm.setName(user.getName());
        profileForm.setDepartment(user.getDepartment());
        profileForm.setStartDate(user.getStartDate());
        model.addAttribute("profileForm", profileForm);
        model.addAttribute("profile", user);
        return "profile";
    }
}
