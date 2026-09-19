package com.codev.onboardingdiary.web;

import com.codev.onboardingdiary.service.NotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

@ControllerAdvice(assignableTypes = {
        AuthController.class, DashboardController.class, TaskController.class, IssueController.class,
        FeedbackController.class, NoteController.class, SearchController.class,
        ReportController.class, ProfileController.class, ManagerController.class, AdminController.class})
public class GlobalErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalErrorHandler.class);

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public String accessDenied(AccessDeniedException ex, Model model, HttpServletResponse response) {
        log.warn("Access denied: {}", ex.getMessage());
        response.setStatus(HttpStatus.FORBIDDEN.value());
        model.addAttribute("errorTitle", "Access denied");
        model.addAttribute("errorMessage", "You do not have permission to view or change this record.");
        return "error/message";
    }

    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public String notFound(NotFoundException ex, Model model, HttpServletResponse response) {
        response.setStatus(HttpStatus.NOT_FOUND.value());
        model.addAttribute("errorTitle", "Not found");
        model.addAttribute("errorMessage", ex.getMessage());
        return "error/message";
    }
}
