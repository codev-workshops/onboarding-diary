package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.Texts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Creates the first admin account when none exists. */
@Component
@Order(1)
public class AdminSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final String adminEmail;
  private final String adminPassword;

  public AdminSeeder(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      @Value("${app.seed.admin-email}") String adminEmail,
      @Value("${app.seed.admin-password}") String adminPassword) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.adminEmail = Texts.normalizeEmail(adminEmail);
    this.adminPassword = adminPassword;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (userRepository.existsByRole(Role.ADMIN)) {
      return;
    }
    userRepository.save(
        new User(adminEmail, passwordEncoder.encode(adminPassword), "Administrator", Role.ADMIN));
    log.info("Seeded initial admin account {}", adminEmail);
  }
}
