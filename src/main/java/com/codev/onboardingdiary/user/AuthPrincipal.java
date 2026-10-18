package com.codev.onboardingdiary.user;

import java.io.Serializable;

/** Minimal principal stored in the HTTP session. Roles are re-read from the database. */
public record AuthPrincipal(Long userId, String email) implements Serializable {}
