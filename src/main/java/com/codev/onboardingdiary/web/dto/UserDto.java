package com.codev.onboardingdiary.web.dto;

import com.codev.onboardingdiary.domain.Role;
import java.time.LocalDate;

public record UserDto(Long id,
                      String name,
                      String email,
                      Role role,
                      String department,
                      LocalDate startDate,
                      boolean active,
                      Long managerId,
                      String managerName) {
}
