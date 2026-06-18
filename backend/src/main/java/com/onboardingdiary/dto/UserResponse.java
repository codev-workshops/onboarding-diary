package com.onboardingdiary.dto;

import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Public projection of a user. Never exposes the password hash.
 */
public record UserResponse(
        Long id,
        String email,
        String name,
        Role role,
        UserStatus status,
        String department,
        LocalDate joinDate,
        Long managerId,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getStatus(),
                user.getDepartment(),
                user.getJoinDate(),
                user.getManagerId(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
