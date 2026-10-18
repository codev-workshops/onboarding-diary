package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.Texts;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The logged-in user's own profile and password. */
@Service
public class ProfileService {

  private final CurrentUser currentUser;
  private final PasswordEncoder passwordEncoder;
  private final UserRules userRules;

  public ProfileService(
      CurrentUser currentUser, PasswordEncoder passwordEncoder, UserRules userRules) {
    this.currentUser = currentUser;
    this.passwordEncoder = passwordEncoder;
    this.userRules = userRules;
  }

  @Transactional(readOnly = true)
  public UserDto get() {
    return UserDto.of(currentUser.get());
  }

  @Transactional
  public UserDto update(ProfileUpdateRequest request) {
    User user = currentUser.get();
    userRules.validateStartDate(user.getRole(), request.startDate());
    user.setName(request.name());
    user.setDepartment(Texts.trimToNull(request.department()));
    user.setStartDate(request.startDate());
    return UserDto.of(user);
  }

  @Transactional
  public void changePassword(PasswordChangeRequest request) {
    User user = currentUser.get();
    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw ApiException.fieldError("currentPassword", "is incorrect");
    }
    if (request.currentPassword().equals(request.newPassword())) {
      throw ApiException.fieldError("newPassword", "must differ from the current password");
    }
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
  }
}
