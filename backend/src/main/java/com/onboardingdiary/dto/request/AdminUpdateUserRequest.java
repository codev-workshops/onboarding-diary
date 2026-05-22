package com.onboardingdiary.dto.request;

import com.onboardingdiary.enums.Role;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AdminUpdateUserRequest {
    private Role role;
    private Boolean isActive;
    private UUID managerId;
}
