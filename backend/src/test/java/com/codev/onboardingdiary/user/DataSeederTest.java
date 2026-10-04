package com.codev.onboardingdiary.user;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codev.onboardingdiary.config.AppProperties;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DataSeederTest {

  private static final String ADMIN_EMAIL = "admin@example.com";

  private final UserRepository userRepository = mock(UserRepository.class);
  private final UserAccountService userAccountService = mock(UserAccountService.class);
  private final AppProperties properties = mock(AppProperties.class);
  private DataSeeder seeder;

  @BeforeEach
  void setUp() {
    AppProperties.Admin admin = mock(AppProperties.Admin.class);
    when(admin.email()).thenReturn(ADMIN_EMAIL);
    when(admin.password()).thenReturn("Admin@12345");
    when(properties.admin()).thenReturn(admin);
    seeder = new DataSeeder(properties, userRepository, userAccountService);
  }

  @Test
  void createsAdminWhenEmailIsFree() {
    when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.empty());

    seeder.run(null);

    verify(userAccountService)
        .createAccount(eq(ADMIN_EMAIL), anyString(), eq(Set.of(Role.ADMIN)), any());
  }

  @Test
  void leavesExistingAdminUntouched() {
    User existing = userWith(Role.ADMIN);
    when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(existing));

    seeder.run(null);

    verify(userAccountService, never()).createAccount(anyString(), anyString(), any(), any());
  }

  @Test
  void refusesToStartWhenAdminEmailBelongsToNonAdmin() {
    User existing = userWith(Role.RECRUIT);
    when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> seeder.run(null))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("non-admin account");
    verify(userAccountService, never()).createAccount(anyString(), anyString(), any(), any());
  }

  @Test
  void assignsExistingDemoManagerToNewlySeededRecruits() {
    when(properties.seedDemoData()).thenReturn(true);
    User admin = userWith(Role.ADMIN);
    when(userRepository.findByEmail(ADMIN_EMAIL)).thenReturn(Optional.of(admin));
    User manager = userWith(Role.MANAGER);
    when(userRepository.findByEmail(DataSeeder.DEMO_MANAGER_EMAIL))
        .thenReturn(Optional.of(manager));
    Profile recruitProfile = mock(Profile.class);
    when(userAccountService.createAccount(
            anyString(), anyString(), eq(Set.of(Role.RECRUIT)), any()))
        .thenReturn(recruitProfile);

    seeder.run(null);

    verify(userAccountService, never())
        .createAccount(anyString(), anyString(), eq(Set.of(Role.MANAGER)), any());
    verify(recruitProfile, times(2)).setManager(manager);
  }

  private static User userWith(Role role) {
    User user = mock(User.class);
    when(user.getRoles()).thenReturn(Set.of(role));
    return user;
  }
}
