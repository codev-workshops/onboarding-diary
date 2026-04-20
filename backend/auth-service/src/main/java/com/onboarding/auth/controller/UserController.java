package com.onboarding.auth.controller;

import com.onboarding.auth.dto.AdminUpdateUserRequest;
import com.onboarding.auth.dto.UpdateProfileRequest;
import com.onboarding.auth.dto.UserResponse;
import com.onboarding.auth.service.UserService;
import com.onboarding.common.dto.PageResponse;
import com.onboarding.common.exception.AccessDeniedException;
import com.onboarding.common.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        String userId = SecurityUtils.getCurrentUserId();
        UserResponse response = userService.getUserById(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateProfile(@RequestBody UpdateProfileRequest request) {
        String userId = SecurityUtils.getCurrentUserId();
        UserResponse response = userService.updateProfile(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<UserResponse>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String role) {
        if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only admins can list users");
        }
        PageResponse<UserResponse> response = userService.listUsers(page, size, role);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id) {
        String currentUserId = SecurityUtils.getCurrentUserId();
        if (!SecurityUtils.isAdmin() && !currentUserId.equals(id)) {
            throw new AccessDeniedException("You can only view your own profile");
        }
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> adminUpdateUser(
            @PathVariable String id,
            @RequestBody AdminUpdateUserRequest request) {
        if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only admins can update users");
        }
        UserResponse response = userService.adminUpdateUser(id, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<UserResponse> deactivateUser(@PathVariable String id) {
        if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only admins can deactivate users");
        }
        UserResponse response = userService.setUserActive(id, false);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<UserResponse> activateUser(@PathVariable String id) {
        if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only admins can activate users");
        }
        UserResponse response = userService.setUserActive(id, true);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/recruits")
    public ResponseEntity<PageResponse<UserResponse>> getMyRecruits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!SecurityUtils.isManager() && !SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only managers can view their recruits");
        }
        String managerId = SecurityUtils.getCurrentUserId();
        PageResponse<UserResponse> response = userService.getMyRecruits(managerId, page, size);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{recruitId}/assign/{managerId}")
    public ResponseEntity<UserResponse> assignRecruit(
            @PathVariable String recruitId,
            @PathVariable String managerId) {
        if (!SecurityUtils.isAdmin()) {
            throw new AccessDeniedException("Only admins can assign recruits");
        }
        UserResponse response = userService.assignRecruit(recruitId, managerId);
        return ResponseEntity.ok(response);
    }
}
