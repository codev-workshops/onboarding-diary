package com.workshop.onboardingdiary.bootstrap;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.workshop.onboardingdiary.config.AdminBootstrapProperties;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AdminBootstrapRunnerTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void clearUsers() {
        userRepository.deleteAll();
    }

    private AdminBootstrapRunner runnerFor(AdminBootstrapProperties properties) {
        return new AdminBootstrapRunner(properties, userRepository, departmentRepository, passwordEncoder);
    }

    private AdminBootstrapProperties properties(String email, String password) {
        AdminBootstrapProperties properties = new AdminBootstrapProperties();
        properties.setEmail(email);
        properties.setPassword(password);
        return properties;
    }

    @Test
    void createsAdminWhenAbsent() {
        AdminBootstrapProperties properties = properties("Admin@Example.com", "s3cret-password");
        properties.setName("Ada Admin");
        properties.setDepartment("Engineering");
        properties.setStartDate("2026-02-03");

        runnerFor(properties).run(null);

        User admin = userRepository.findByEmailIgnoreCase("admin@example.com").orElseThrow();
        assertThat(admin.getName()).isEqualTo("Ada Admin");
        assertThat(admin.getEmail()).isEqualTo("admin@example.com");
        assertThat(admin.getRole()).isEqualTo(Role.ADMIN);
        assertThat(admin.isActive()).isTrue();
        assertThat(admin.getStartDate()).isEqualTo(LocalDate.of(2026, 2, 3));
        assertThat(admin.getDepartment().getName()).isEqualTo("Engineering");
        assertThat(admin.getPasswordHash()).isNotEqualTo("s3cret-password");
        assertThat(passwordEncoder.matches("s3cret-password", admin.getPasswordHash())).isTrue();
    }

    @Test
    void appliesDefaultsForOptionalVariables() {
        runnerFor(properties("defaults@example.com", "s3cret-password")).run(null);

        User admin = userRepository.findByEmailIgnoreCase("defaults@example.com").orElseThrow();
        assertThat(admin.getName()).isEqualTo("Administrator");
        assertThat(admin.getDepartment().getName()).isEqualTo("Other");
        assertThat(admin.getStartDate()).isEqualTo(LocalDate.now());
    }

    @Test
    void isIdempotentAcrossRestarts() {
        AdminBootstrapProperties first = properties("admin@example.com", "s3cret-password");
        first.setName("Original Name");
        runnerFor(first).run(null);
        String originalHash = userRepository.findByEmailIgnoreCase("admin@example.com").orElseThrow().getPasswordHash();

        AdminBootstrapProperties second = properties("admin@example.com", "a-different-password");
        second.setName("Replacement Name");
        runnerFor(second).run(null);

        List<User> admins = userRepository.findAll();
        assertThat(admins).hasSize(1);
        assertThat(admins.get(0).getName()).isEqualTo("Original Name");
        assertThat(admins.get(0).getPasswordHash()).isEqualTo(originalHash);
    }

    @Test
    void warnsAndCreatesNothingWhenRequiredVariablesAreMissing() {
        Logger runnerLogger = (Logger) LoggerFactory.getLogger(AdminBootstrapRunner.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        runnerLogger.addAppender(appender);
        try {
            runnerFor(properties(null, null)).run(null);
            runnerFor(properties("admin@example.com", "  ")).run(null);
            runnerFor(properties("", "s3cret-password")).run(null);
        } finally {
            runnerLogger.detachAppender(appender);
        }

        assertThat(userRepository.count()).isZero();
        assertThat(appender.list)
                .hasSize(3)
                .allSatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.WARN);
                    assertThat(event.getFormattedMessage()).contains("ADMIN_EMAIL/ADMIN_PASSWORD");
                });
    }
}
