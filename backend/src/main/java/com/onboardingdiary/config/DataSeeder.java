package com.onboardingdiary.config;

import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    public ApplicationRunner seedAdmin(SeedProperties properties,
                                       UserRepository userRepository,
                                       PasswordEncoder passwordEncoder) {
        return args -> {
            if (!properties.isEnabled()) {
                return;
            }
            if (userRepository.existsByEmailIgnoreCase(properties.getAdminEmail())) {
                return;
            }
            User admin = new User();
            admin.setName(properties.getAdminName());
            admin.setEmail(properties.getAdminEmail());
            admin.setRole(Role.ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            admin.setPasswordHash(passwordEncoder.encode(properties.getAdminPassword()));
            userRepository.save(admin);
            log.info("Seeded initial admin user: {}", properties.getAdminEmail());
        };
    }
}
