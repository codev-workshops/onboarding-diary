package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.AdminCreateUserRequest;
import com.onboardingdiary.dto.request.AdminUpdateUserRequest;
import com.onboardingdiary.dto.request.UpdateProfileRequest;
import com.onboardingdiary.dto.response.UserResponse;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserResponse getUserById(UUID userId) {
        User user = findUserOrThrow(userId);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);

        if (request.getFullName() != null) {
            user.setFullName(request.getFullName());
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getStartDate() != null) {
            user.setStartDate(request.getStartDate());
        }

        user = userRepository.save(user);
        return UserResponse.from(user);
    }

    public Page<UserResponse> listUsers(String role, Boolean isActive, Pageable pageable) {
        String roleStr = role != null ? role.toUpperCase() : null;
        return userRepository.findWithFilters(roleStr, isActive, pageable)
                .map(UserResponse::from);
    }

    @Transactional
    public UserResponse adminUpdateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = findUserOrThrow(userId);

        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }
        if (request.getManagerId() != null) {
            User manager = userRepository.findById(request.getManagerId())
                    .orElseThrow(() -> new BadRequestException("Manager not found"));
            if (manager.getRole() != Role.MANAGER) {
                throw new BadRequestException("Assigned user is not a manager");
            }
            user.setManager(manager);
        }

        user = userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse createUser(AdminCreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .department(request.getDepartment())
                .startDate(request.getStartDate())
                .build();

        user = userRepository.save(user);
        return UserResponse.from(user);
    }

    public List<UserResponse> getRecruitsForManager(UUID managerId) {
        return userRepository.findByManagerId(managerId).stream()
                .map(UserResponse::from)
                .collect(Collectors.toList());
    }

    public void verifyManagerAccess(UUID requesterId, String role, UUID targetUserId) {
        if (role.equals("ADMIN")) return;
        if (role.equals("MANAGER")) {
            User target = findUserOrThrow(targetUserId);
            if (target.getManager() != null && target.getManager().getId().equals(requesterId)) {
                return;
            }
            throw new UnauthorizedException("You can only access data for recruits assigned to you");
        }
        throw new UnauthorizedException("Access denied");
    }

    private User findUserOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
