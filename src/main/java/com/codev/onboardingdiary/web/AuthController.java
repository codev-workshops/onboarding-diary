package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.service.EmailAlreadyUsedException;
import com.codev.onboardingdiary.service.UserService;
import com.codev.onboardingdiary.web.dto.SignupForm;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/")
    public String home(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated()
                ? "redirect:/dashboard"
                : "redirect:/login";
    }

    @GetMapping("/login")
    public String login(Authentication authentication) {
        return authentication != null && authentication.isAuthenticated() ? "redirect:/dashboard" : "login";
    }

    @GetMapping("/signup")
    public String signupForm(Model model) {
        model.addAttribute("signupForm", new SignupForm());
        return "signup";
    }

    @PostMapping("/signup")
    public String signup(@Valid @ModelAttribute("signupForm") SignupForm form, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return "signup";
        }
        try {
            userService.register(form);
        } catch (EmailAlreadyUsedException ex) {
            bindingResult.addError(new FieldError("signupForm", "email", ex.getMessage()));
            return "signup";
        }
        return "redirect:/login?registered";
    }
}
