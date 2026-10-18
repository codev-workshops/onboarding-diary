package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** Resolves the logged-in {@link User} for the current request. */
@Component
public class CurrentUser {

  private final UserRepository userRepository;

  public CurrentUser(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public User get() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
      throw ApiException.unauthorized("Authentication required");
    }
    return userRepository
        .findById(principal.userId())
        .orElseThrow(() -> ApiException.unauthorized("Authentication required"));
  }
}
