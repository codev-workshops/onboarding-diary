package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.domain.Priority;
import com.codev.onboardingdiary.domain.Task;
import com.codev.onboardingdiary.domain.TaskStatus;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.service.TaskService;
import com.codev.onboardingdiary.web.dto.TaskFilter;
import com.codev.onboardingdiary.web.dto.TaskForm;
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
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/tasks")
    public String list(@AuthenticationPrincipal AppUserDetails principal,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                       @RequestParam(required = false) String category,
                       @RequestParam(required = false) TaskStatus status,
                       Model model) {
        TaskFilter filter = new TaskFilter(from, to, category, status);
        model.addAttribute("tasks", taskService.list(principal, principal.getId(), filter));
        model.addAttribute("filter", filter);
        model.addAttribute("categories", taskService.categoriesOf(principal.getId()));
        model.addAttribute("statuses", TaskStatus.values());
        model.addAttribute("overdueBefore", LocalDate.now().minusDays(7));
        return "tasks/list";
    }

    @GetMapping("/tasks/new")
    public String newForm(Model model) {
        if (!model.containsAttribute("taskForm")) {
            TaskForm form = new TaskForm();
            form.setDate(LocalDate.now());
            form.setStatus(TaskStatus.TODO);
            form.setPriority(Priority.MEDIUM);
            model.addAttribute("taskForm", form);
        }
        model.addAttribute("statuses", TaskStatus.values());
        model.addAttribute("priorities", Priority.values());
        return "tasks/form";
    }

    @PostMapping("/tasks")
    public String create(@AuthenticationPrincipal AppUserDetails principal,
                         @Valid @ModelAttribute("taskForm") TaskForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("statuses", TaskStatus.values());
            model.addAttribute("priorities", Priority.values());
            return "tasks/form";
        }
        taskService.create(principal, form);
        redirectAttributes.addFlashAttribute("successMessage", "Task created");
        return "redirect:/tasks";
    }

    @GetMapping("/tasks/edit/{id}")
    public String editForm(@AuthenticationPrincipal AppUserDetails principal,
                           @PathVariable Long id,
                           Model model) {
        Task task = taskService.getOwned(principal, id);
        TaskForm form = new TaskForm();
        form.setDate(task.getDate());
        form.setTitle(task.getTitle());
        form.setDescription(task.getDescription());
        form.setCategory(task.getCategory());
        form.setStatus(task.getStatus());
        form.setPriority(task.getPriority());
        model.addAttribute("taskForm", form);
        model.addAttribute("taskId", id);
        model.addAttribute("statuses", TaskStatus.values());
        model.addAttribute("priorities", Priority.values());
        return "tasks/form";
    }

    @PostMapping("/tasks/edit/{id}")
    public String update(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         @Valid @ModelAttribute("taskForm") TaskForm form,
                         BindingResult bindingResult,
                         Model model,
                         RedirectAttributes redirectAttributes) {
        if (bindingResult.hasErrors()) {
            model.addAttribute("taskId", id);
            model.addAttribute("statuses", TaskStatus.values());
            model.addAttribute("priorities", Priority.values());
            return "tasks/form";
        }
        taskService.update(principal, id, form);
        redirectAttributes.addFlashAttribute("successMessage", "Task updated");
        return "redirect:/tasks";
    }

    @PostMapping("/tasks/delete/{id}")
    public String delete(@AuthenticationPrincipal AppUserDetails principal,
                         @PathVariable Long id,
                         RedirectAttributes redirectAttributes) {
        taskService.delete(principal, id);
        redirectAttributes.addFlashAttribute("successMessage", "Task deleted");
        return "redirect:/tasks";
    }
}
