package com.workshop.onboardingdiary.support;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import java.time.LocalDate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates users directly in the database for authentication tests. */
@Component
public class TestUsers {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public TestUsers(UserRepository userRepository,
                     DepartmentRepository departmentRepository,
                     PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User create(String email, String rawPassword, Role role, boolean active) {
        return create(email, rawPassword, role, active, LocalDate.of(2026, 1, 5));
    }

    public User create(String email, String rawPassword, Role role, boolean active, LocalDate startDate) {
        User user = new User();
        user.setName("Test User");
        user.setEmail(email.toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setDepartment(departmentRepository.findByNameIgnoreCase("Engineering").orElseThrow());
        user.setStartDate(startDate);
        user.setActive(active);
        return userRepository.save(user);
    }
}
