package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.DepartmentResponse;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only access to the Admin-maintained department list; maintenance is a later phase. */
@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> list(Boolean active) {
        return departmentRepository.findAll().stream()
                .filter(department -> active == null || department.isActive() == active)
                .sorted(Comparator.comparing(department -> department.getName().toLowerCase()))
                .map(DepartmentResponse::from)
                .toList();
    }
}
