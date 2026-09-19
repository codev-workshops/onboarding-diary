package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Note;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.NoteService;
import com.codev.onboardingdiary.web.dto.NoteFilter;
import com.codev.onboardingdiary.web.dto.NoteForm;
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
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping("/notes")
    public String list(@AuthenticationPrincipal AppUserDetails principal,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                       @RequestParam(required = false) String q,
                       Model model) {
        NoteFilter filter = new NoteFilter(from, to, q);
        model.addAttribute("notes", noteService.list(principal, principal.getId(), filter));
        model.addAttribute("filter", filter);
        return "notes/list";
    }

    @GetMapping("/notes/new")
    public String newForm(Model model) {
        if (!model.containsAttribute("noteForm")) {
            NoteForm form = new NoteForm();
            form.setDate(LocalDate.now());
            model.addAttribute("noteForm", form);
        }
        return "notes/form";
    }

    @PostMapping("/notes")
    public String create(@AuthenticationPrincipal AppUserDetails principal,
                         @Valid @ModelAttribute("noteForm") NoteForm form,
                         BindingResult bindingResult,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            return "notes/form";
        }
        noteService.create(principal, form);
        redirectAttributes.addFlashAttribute("successMessage", "Note created");
        return "redirect:/notes";
    }

    @GetMapping("/notes/edit/{id}")
    public String editForm(@AuthenticationPrincipal AppUserDetails principal,
                           @PathVariable Long id,
                           Model model) {
        Note note = noteService.getOwned(principal, id);
        NoteForm form = new NoteForm();
        form.setDate(note.getDate());
        form.setTitle(note.getTitle());
        form.setContent(note.getContent());
        form.setTags(note.getTags());
        model.addAttribute("noteForm", form);
        model.addAttribute("noteId", id);
        return "notes/form";
    }

    @PostMapping("/notes/edit/{id}")
    public String update(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         @Valid @ModelAttribute("noteForm") NoteForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("noteId", id);
            return "notes/form";
        }
        noteService.update(principal, id, form);
        redirectAttributes.addFlashAttribute("successMessage", "Note updated");
        return "redirect:/notes";
    }

    @PostMapping("/notes/delete/{id}")
    public String delete(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         RedirectAttributes redirectAttributes) {
        noteService.delete(principal, id);
        redirectAttributes.addFlashAttribute("successMessage", "Note deleted");
        return "redirect:/notes";
    }
}
