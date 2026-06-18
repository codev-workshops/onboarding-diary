package com.onboardingdiary.entity;

/**
 * Application roles. A single role is assigned per user (see DESIGN_REVIEW.md MVP
 * simplification: one combined users table with a role column).
 */
public enum Role {
    ADMIN,
    MANAGER,
    RECRUIT
}
