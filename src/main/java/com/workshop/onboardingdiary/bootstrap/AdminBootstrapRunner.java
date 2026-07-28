package com.workshop.onboardingdiary.bootstrap;

import com.workshop.onboardingdiary.config.AdminBootstrapProperties;
import com.workshop.onboardingdiary.entity.Department;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Creates the first Admin account from the ADMIN_* environment variables (decision D1 / US-A00).
 * Idempotent: an existing account with the configured email is never modified.
 */
@Component
public class AdminBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrapRunner.class);
    private static final String FALLBACK_DEPARTMENT = "Other";

    private final AdminBootstrapProperties properties;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminBootstrapRunner(AdminBootstrapProperties properties,
                                UserRepository userRepository,
                                DepartmentRepository departmentRepository,
                                PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String email = normaliseEmail(properties.getEmail());
        String password = properties.getPassword();

        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            if (!userRepository.existsByRoleAndActiveTrue(Role.ADMIN)) {
                log.warn("No active Admin account exists and ADMIN_EMAIL/ADMIN_PASSWORD are not set. "
                        + "Set both environment variables and restart to bootstrap the first Admin.");
            }
            return;
        }

        if (userRepository.existsByEmailIgnoreCase(email)) {
            log.info("Bootstrap Admin already exists; leaving the existing account untouched.");
            return;
        }

        User admin = new User();
        admin.setName(StringUtils.hasText(properties.getName()) ? properties.getName() : "Administrator");
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setDepartment(resolveDepartment(properties.getDepartment()));
        admin.setStartDate(resolveStartDate(properties.getStartDate()));
        admin.setActive(true);

        userRepository.save(admin);
        log.info("Bootstrap Admin account created for {}.", email);
    }

    private String normaliseEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private Department resolveDepartment(String name) {
        String requested = StringUtils.hasText(name) ? name.trim() : FALLBACK_DEPARTMENT;
        return departmentRepository.findByNameIgnoreCase(requested)
                .or(() -> {
                    log.warn("Department '{}' not found; falling back to '{}'.", requested, FALLBACK_DEPARTMENT);
                    return departmentRepository.findByNameIgnoreCase(FALLBACK_DEPARTMENT);
                })
                .orElseThrow(() -> new IllegalStateException(
                        "No department available to assign to the bootstrap Admin; expected the seeded department list."));
    }

    private LocalDate resolveStartDate(String startDate) {
        if (!StringUtils.hasText(startDate)) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(startDate.trim());
        } catch (DateTimeParseException ex) {
            log.warn("ADMIN_START_DATE '{}' is not an ISO date (yyyy-MM-dd); using today instead.", startDate);
            return LocalDate.now();
        }
    }
}
