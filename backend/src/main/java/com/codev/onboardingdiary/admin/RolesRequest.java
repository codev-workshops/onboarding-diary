package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.user.Role;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record RolesRequest(@NotEmpty Set<@NotNull Role> roles) {}
