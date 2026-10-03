package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.config.AppProperties;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates the bootstrap administrator on first startup and, when {@code app.seed-demo-data} is
 * enabled, a demo manager with two recruits.
 */
@Component
public class DataSeeder implements ApplicationRunner {

  static final String DEMO_PASSWORD = "Password1";
  static final String DEMO_MANAGER_EMAIL = "manager@example.com";

  private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

  private final AppProperties properties;
  private final UserRepository userRepository;
  private final UserAccountService userAccountService;

  public DataSeeder(
      AppProperties properties,
      UserRepository userRepository,
      UserAccountService userAccountService) {
    this.properties = properties;
    this.userRepository = userRepository;
    this.userAccountService = userAccountService;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    seedAdmin();
    if (properties.seedDemoData()) {
      seedDemoUsers();
    }
  }

  private void seedAdmin() {
    AppProperties.Admin admin = properties.admin();
    if (isBlank(admin.email()) || isBlank(admin.password())) {
      log.warn("APP_ADMIN_EMAIL/APP_ADMIN_PASSWORD not set; skipping admin bootstrap");
      return;
    }
    String email = UserAccountService.normalizeEmail(admin.email());
    Optional<User> existing = userRepository.findByEmail(email);
    if (existing.isPresent()) {
      if (!existing.get().getRoles().contains(Role.ADMIN)) {
        throw new IllegalStateException(
            "Configured admin email "
                + email
                + " belongs to an existing non-admin account. Set APP_ADMIN_EMAIL to a"
                + " different address or grant that account the ADMIN role.");
      }
      return;
    }
    log.info("Seeding admin {}", email);
    userAccountService.createAccount(
        email,
        admin.password(),
        Set.of(Role.ADMIN),
        new ProfileDetails("System Administrator", null, "IT", LocalDate.now()));
  }

  private void seedDemoUsers() {
    User manager =
        userRepository
            .findByEmail(DEMO_MANAGER_EMAIL)
            .orElseGet(
                () ->
                    createIfMissing(
                            DEMO_MANAGER_EMAIL,
                            DEMO_PASSWORD,
                            Set.of(Role.MANAGER),
                            new ProfileDetails(
                                "Maria Manager",
                                "Engineering Manager",
                                "Engineering",
                                LocalDate.of(2020, 1, 6)))
                        .getUser());
    LocalDate recentStart = LocalDate.now().minusDays(14);
    for (String[] recruit :
        new String[][] {
          {"recruit1@example.com", "Asha Recruit", "Backend Engineer"},
          {"recruit2@example.com", "Ben Recruit", "QA Engineer"}
        }) {
      Profile profile =
          createIfMissing(
              recruit[0],
              DEMO_PASSWORD,
              Set.of(Role.RECRUIT),
              new ProfileDetails(recruit[1], recruit[2], "Engineering", recentStart));
      if (profile != null) {
        profile.setManager(manager);
      }
    }
  }

  private Profile createIfMissing(
      String email, String password, Set<Role> roles, ProfileDetails details) {
    if (userRepository.existsByEmail(UserAccountService.normalizeEmail(email))) {
      return null;
    }
    log.info("Seeding user {}", email);
    return userAccountService.createAccount(email, password, roles, details);
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
