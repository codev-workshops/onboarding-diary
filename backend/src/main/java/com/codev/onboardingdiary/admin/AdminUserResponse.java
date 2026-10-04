package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.UserDto.ProfileDto;
import java.time.Instant;
import java.util.Set;

/** A user as seen by administrators, including account status. */
public record AdminUserResponse(
    Long id,
    String email,
    Set<Role> roles,
    boolean enabled,
    boolean mustChangePassword,
    boolean locked,
    Instant lastLoginAt,
    Instant createdAt,
    ProfileDto profile) {}
