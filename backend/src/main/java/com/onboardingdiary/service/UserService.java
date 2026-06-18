package com.onboardingdiary.service;

import com.onboardingdiary.dto.AdminUpdateUserRequest;
import com.onboardingdiary.dto.CreateUserRequest;
import com.onboardingdiary.dto.UpdateProfileRequest;
import com.onboardingdiary.dto.UserResponse;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.exception.ConflictException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.ValidationException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("A user with this email already exists");
        }
        validateManager(request.managerId());

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(request.email().trim());
        user.setRole(request.role());
        user.setStatus(UserStatus.ACTIVE);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDepartment(trimToNull(request.department()));
        user.setJoinDate(request.joinDate());
        user.setManagerId(request.managerId());

        return UserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> list(AuthenticatedUser caller, Role roleFilter, Pageable pageable) {
        Role callerRole = Role.valueOf(caller.role());
        Page<User> page;
        if (callerRole == Role.ADMIN) {
            page = (roleFilter != null)
                    ? userRepository.findByRole(roleFilter, pageable)
                    : userRepository.findAll(pageable);
        } else if (callerRole == Role.MANAGER) {
            // Managers only see recruits assigned to them.
            page = userRepository.findByManagerId(caller.id(), pageable);
        } else {
            throw new AccessDeniedException("Recruits cannot list users");
        }
        return page.map(UserResponse::from);
    }

    @Transactional(readOnly = true)
    public UserResponse get(AuthenticatedUser caller, Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!canRead(caller, user)) {
            // Use 404 to avoid disclosing existence of other users' records.
            throw new ResourceNotFoundException("User not found");
        }
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse adminUpdate(Long id, AdminUpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        validateManager(request.managerId());
        if (request.managerId() != null && request.managerId().equals(id)) {
            throw new ValidationException("A user cannot be their own manager");
        }
        user.setName(request.name().trim());
        user.setRole(request.role());
        user.setStatus(request.status());
        user.setDepartment(trimToNull(request.department()));
        user.setJoinDate(request.joinDate());
        user.setManagerId(request.managerId());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateOwnProfile(AuthenticatedUser caller, UpdateProfileRequest request) {
        User user = userRepository.findById(caller.id())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setName(request.name().trim());
        user.setDepartment(trimToNull(request.department()));
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void disable(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        // Soft delete: disable the account rather than hard-deleting (preserves
        // referential integrity for future diary/milestone data).
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);
    }

    private boolean canRead(AuthenticatedUser caller, User target) {
        Role callerRole = Role.valueOf(caller.role());
        if (callerRole == Role.ADMIN) {
            return true;
        }
        if (caller.id().equals(target.getId())) {
            return true;
        }
        return callerRole == Role.MANAGER && caller.id().equals(target.getManagerId());
    }

    private void validateManager(Long managerId) {
        if (managerId == null) {
            return;
        }
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new ValidationException("Manager not found"));
        if (manager.getRole() == Role.RECRUIT) {
            throw new ValidationException("Assigned manager must have role MANAGER or ADMIN");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
