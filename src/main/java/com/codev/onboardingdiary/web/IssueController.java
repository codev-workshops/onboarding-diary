package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.Severity;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.IssueService;
import com.codev.onboardingdiary.web.dto.IssueFilter;
import com.codev.onboardingdiary.web.dto.IssueForm;
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
public class IssueController {

    private final IssueService issueService;

    public IssueController(IssueService issueService) {
        this.issueService = issueService;
    }

    @GetMapping("/issues")
    public String list(@AuthenticationPrincipal AppUserDetails principal,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                       @RequestParam(required = false) IssueStatus status,
                       @RequestParam(required = false) Severity severity,
                       Model model) {
        IssueFilter filter = new IssueFilter(from, to, status, severity);
        model.addAttribute("issues", issueService.list(principal, principal.getId(), filter));
        model.addAttribute("filter", filter);
        model.addAttribute("statuses", IssueStatus.values());
        model.addAttribute("severities", Severity.values());
        return "issues/list";
    }

    @GetMapping("/issues/new")
    public String newForm(Model model) {
        if (!model.containsAttribute("issueForm")) {
            IssueForm form = new IssueForm();
            form.setDate(LocalDate.now());
            form.setStatus(IssueStatus.OPEN);
            form.setSeverity(Severity.MEDIUM);
            model.addAttribute("issueForm", form);
        }
        model.addAttribute("statuses", IssueStatus.values());
        model.addAttribute("severities", Severity.values());
        return "issues/form";
    }

    @PostMapping("/issues")
    public String create(@AuthenticationPrincipal AppUserDetails principal,
                         @Valid @ModelAttribute("issueForm") IssueForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("statuses", IssueStatus.values());
            model.addAttribute("severities", Severity.values());
            return "issues/form";
        }
        issueService.create(principal, form);
        redirectAttributes.addFlashAttribute("successMessage", "Issue logged");
        return "redirect:/issues";
    }

    @GetMapping("/issues/edit/{id}")
    public String editForm(@AuthenticationPrincipal AppUserDetails principal,
                           @PathVariable Long id,
                           Model model) {
        Issue issue = issueService.getOwned(principal, id);
        IssueForm form = new IssueForm();
        form.setDate(issue.getDate());
        form.setTitle(issue.getTitle());
        form.setDescription(issue.getDescription());
        form.setSeverity(issue.getSeverity());
        form.setStatus(issue.getStatus());
        form.setResolutionNotes(issue.getResolutionNotes());
        model.addAttribute("issueForm", form);
        model.addAttribute("issueId", id);
        model.addAttribute("statuses", IssueStatus.values());
        model.addAttribute("severities", Severity.values());
        return "issues/form";
    }

    @PostMapping("/issues/edit/{id}")
    public String update(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         @Valid @ModelAttribute("issueForm") IssueForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("issueId", id);
            model.addAttribute("statuses", IssueStatus.values());
            model.addAttribute("severities", Severity.values());
            return "issues/form";
        }
        issueService.update(principal, id, form);
        redirectAttributes.addFlashAttribute("successMessage", "Issue updated");
        return "redirect:/issues";
    }

    @PostMapping("/issues/delete/{id}")
    public String delete(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         RedirectAttributes redirectAttributes) {
        issueService.delete(principal, id);
        redirectAttributes.addFlashAttribute("successMessage", "Issue deleted");
        return "redirect:/issues";
    }
}
