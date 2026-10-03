package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.user.Role;
import java.util.Set;

/** Principal stored in the security context for an authenticated request. */
public record AuthenticatedUser(Long id, String email, Set<Role> roles) {

  public boolean hasRole(Role role) {
    return roles.contains(role);
  }
}
