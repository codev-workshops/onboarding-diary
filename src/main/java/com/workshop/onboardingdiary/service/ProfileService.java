package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.ProfileResponse;
import com.workshop.onboardingdiary.dto.UpdateProfileRequest;
import com.workshop.onboardingdiary.entity.Department;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Self-service profile view and edit (REQUIREMENTS US-R03). Email is immutable and the role is
 * read-only here; only an Admin can change a role.
 */
@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public ProfileService(UserRepository userRepository, DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getCurrentProfile(String email) {
        return ProfileResponse.from(requireUser(email));
    }

    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = requireUser(email);
        Department department = departmentRepository.findByNameIgnoreCase(request.department().trim())
                .orElseThrow(() -> new FieldValidationException("department", "Unknown department"));
        if (!department.isActive()) {
            throw new FieldValidationException("department", "Department is not active");
        }
        user.setName(request.name().trim());
        user.setDepartment(department);
        user.setStartDate(request.startDate());
        return ProfileResponse.from(userRepository.save(user));
    }

    private User requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user " + email + " no longer exists"));
    }
}
