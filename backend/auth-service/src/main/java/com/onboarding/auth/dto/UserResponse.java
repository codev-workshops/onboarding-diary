package com.onboarding.auth.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String id;
    private String email;
    private String name;
    private String role;
    private String department;
    private LocalDate startDate;
    private String bio;
    private String profileImageUrl;
    private String managerId;
    private boolean active;
    private boolean forcePasswordChange;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
