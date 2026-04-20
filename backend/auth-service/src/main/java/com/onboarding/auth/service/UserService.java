package com.onboarding.auth.service;

import com.onboarding.auth.dto.AdminUpdateUserRequest;
import com.onboarding.auth.dto.UpdateProfileRequest;
import com.onboarding.auth.dto.UserResponse;
import com.onboarding.auth.entity.Role;
import com.onboarding.auth.entity.User;
import com.onboarding.auth.repository.UserRepository;
import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.BadRequestException;
import com.onboarding.common.exception.ResourceNotFoundException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public UserResponse getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getProfileImageUrl() != null) {
            user.setProfileImageUrl(request.getProfileImageUrl());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return toUserResponse(user);
    }

    public PageResponse<UserResponse> listUsers(int page, int size, String role) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> userPage;

        if (role != null && !role.isEmpty()) {
            try {
                Role roleEnum = Role.valueOf(role.toUpperCase());
                userPage = userRepository.findByRole(roleEnum, pageable);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role: " + role);
            }
        } else {
            userPage = userRepository.findAllByActiveTrue(pageable);
        }

        return PageResponse.<UserResponse>builder()
                .content(userPage.getContent().stream().map(this::toUserResponse).toList())
                .page(userPage.getNumber())
                .size(userPage.getSize())
                .totalElements(userPage.getTotalElements())
                .totalPages(userPage.getTotalPages())
                .build();
    }

    @Transactional
    public UserResponse adminUpdateUser(String id, AdminUpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getRole() != null) {
            try {
                user.setRole(Role.valueOf(request.getRole().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role: " + request.getRole());
            }
        }
        if (request.getDepartment() != null) {
            user.setDepartment(request.getDepartment());
        }
        if (request.getManagerId() != null) {
            if (!request.getManagerId().isEmpty()) {
                userRepository.findById(request.getManagerId())
                        .orElseThrow(() -> new ResourceNotFoundException("Manager", request.getManagerId()));
            }
            user.setManagerId(request.getManagerId().isEmpty() ? null : request.getManagerId());
        }
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse setUserActive(String id, boolean active) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
        user.setActive(active);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse assignRecruit(String recruitId, String managerId) {
        User recruit = userRepository.findById(recruitId)
                .orElseThrow(() -> new ResourceNotFoundException("Recruit", recruitId));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager", managerId));

        if (manager.getRole() != Role.MANAGER && manager.getRole() != Role.ADMIN) {
            throw new BadRequestException("User " + managerId + " is not a manager");
        }

        recruit.setManagerId(managerId);
        recruit.setUpdatedAt(LocalDateTime.now());
        userRepository.save(recruit);
        return toUserResponse(recruit);
    }

    public PageResponse<UserResponse> getMyRecruits(String managerId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<User> recruitsPage = userRepository.findByManagerId(managerId, pageable);

        return PageResponse.<UserResponse>builder()
                .content(recruitsPage.getContent().stream().map(this::toUserResponse).toList())
                .page(recruitsPage.getNumber())
                .size(recruitsPage.getSize())
                .totalElements(recruitsPage.getTotalElements())
                .totalPages(recruitsPage.getTotalPages())
                .build();
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole().name())
                .department(user.getDepartment())
                .startDate(user.getStartDate())
                .bio(user.getBio())
                .profileImageUrl(user.getProfileImageUrl())
                .managerId(user.getManagerId())
                .active(user.isActive())
                .forcePasswordChange(user.isForcePasswordChange())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
