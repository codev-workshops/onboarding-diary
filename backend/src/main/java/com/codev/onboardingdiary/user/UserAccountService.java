package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.ApiException;
import java.util.Locale;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates user accounts together with their profile. */
@Service
public class UserAccountService {

  private final UserRepository userRepository;
  private final ProfileRepository profileRepository;
  private final PasswordEncoder passwordEncoder;

  public UserAccountService(
      UserRepository userRepository,
      ProfileRepository profileRepository,
      PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public static String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
  }

  @Transactional
  public Profile createAccount(
      String email, String rawPassword, Set<Role> roles, ProfileDetails details) {
    String normalizedEmail = normalizeEmail(email);
    if (userRepository.existsByEmail(normalizedEmail)) {
      throw ApiException.conflict("Email already registered");
    }
    User user =
        userRepository.save(new User(normalizedEmail, passwordEncoder.encode(rawPassword), roles));
    return profileRepository.save(new Profile(user, details));
  }
}
