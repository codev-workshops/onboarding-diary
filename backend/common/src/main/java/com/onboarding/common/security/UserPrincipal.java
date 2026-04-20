package com.onboarding.common.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserPrincipal {
    private final String userId;
    private final String email;
    private final String role;
}
