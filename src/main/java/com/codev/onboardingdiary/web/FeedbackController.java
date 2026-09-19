package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.FeedbackType;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.FeedbackService;
import com.codev.onboardingdiary.web.dto.FeedbackFilter;
import com.codev.onboardingdiary.web.dto.FeedbackForm;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping("/feedback")
    public String list(@AuthenticationPrincipal AppUserDetails principal,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                       @RequestParam(required = false) FeedbackType type,
                       Model model) {
        FeedbackFilter filter = new FeedbackFilter(from, to, type);
        model.addAttribute("feedbackEntries", feedbackService.list(principal, principal.getId(), filter));
        model.addAttribute("filter", filter);
        model.addAttribute("types", FeedbackType.values());
        return "feedback/list";
    }

    @GetMapping("/feedback/new")
    public String newForm(Model model) {
        if (!model.containsAttribute("feedbackForm")) {
            FeedbackForm form = new FeedbackForm();
            form.setDate(LocalDate.now());
            form.setType(FeedbackType.SUGGESTION);
            model.addAttribute("feedbackForm", form);
        }
        model.addAttribute("types", FeedbackType.values());
        return "feedback/form";
    }

    @PostMapping("/feedback")
    public String create(@AuthenticationPrincipal AppUserDetails principal,
                         @Valid @ModelAttribute("feedbackForm") FeedbackForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("types", FeedbackType.values());
            return "feedback/form";
        }
        feedbackService.create(principal, form);
        redirectAttributes.addFlashAttribute("successMessage", "Feedback submitted");
        return "redirect:/feedback";
    }

    @GetMapping("/feedback/edit/{id}")
    public String editForm(@AuthenticationPrincipal AppUserDetails principal,
                           @PathVariable Long id,
                           Model model) {
        Feedback feedback = feedbackService.getOwned(principal, id);
        FeedbackForm form = new FeedbackForm();
        form.setDate(feedback.getDate());
        form.setSubject(feedback.getSubject());
        form.setType(feedback.getType());
        form.setDetails(feedback.getDetails());
        model.addAttribute("feedbackForm", form);
        model.addAttribute("feedbackId", id);
        model.addAttribute("types", FeedbackType.values());
        return "feedback/form";
    }

    @PostMapping("/feedback/edit/{id}")
    public String update(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         @Valid @ModelAttribute("feedbackForm") FeedbackForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("feedbackId", id);
            model.addAttribute("types", FeedbackType.values());
            return "feedback/form";
        }
        feedbackService.update(principal, id, form);
        redirectAttributes.addFlashAttribute("successMessage", "Feedback updated");
        return "redirect:/feedback";
    }

    @PostMapping("/feedback/delete/{id}")
    public String delete(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         RedirectAttributes redirectAttributes) {
        feedbackService.delete(principal, id);
        redirectAttributes.addFlashAttribute("successMessage", "Feedback deleted");
        return "redirect:/feedback";
    }
}
