package com.workshop.onboardingdiary.dto;

import com.workshop.onboardingdiary.entity.Department;

public record DepartmentResponse(Long id, String name, boolean active) {

    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(department.getId(), department.getName(), department.isActive());
    }
}
