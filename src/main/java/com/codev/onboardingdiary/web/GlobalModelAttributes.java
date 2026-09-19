package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.security.AppUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice(basePackages = "com.codev.onboardingdiary.web")
public class GlobalModelAttributes {

    @ModelAttribute("currentUser")
    public AppUserDetails currentUser(@AuthenticationPrincipal AppUserDetails principal) {
        return principal;
    }
}
