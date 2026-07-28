package com.workshop.onboardingdiary.controller;

import com.workshop.onboardingdiary.dto.DepartmentResponse;
import com.workshop.onboardingdiary.service.DepartmentService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public read access to the department list, needed by the sign-up form (REQUIREMENTS 4.9). */
@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public List<DepartmentResponse> list(@RequestParam(name = "active", required = false) Boolean active) {
        return departmentService.list(active);
    }
}
