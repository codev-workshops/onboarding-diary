package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.diary.PageResponse;
import com.codev.onboardingdiary.profile.UpdateProfileRequest;
import com.codev.onboardingdiary.user.Role;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** User administration (ADMIN only, enforced for /api/admin/** in the security config). */
@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

  private final AdminUserService service;

  public AdminUserController(AdminUserService service) {
    this.service = service;
  }

  @GetMapping("/users")
  public PageResponse<AdminUserResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) String department,
      @RequestParam(required = false) Role role,
      @RequestParam(required = false) Boolean enabled,
      @PageableDefault(size = 20) Pageable pageable) {
    return service.list(q, department, role, enabled, pageable);
  }

  @GetMapping("/users/{id}")
  public AdminUserResponse get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping("/users")
  public ResponseEntity<AdminUserResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody CreateUserRequest request) {
    AdminUserResponse created = service.create(principal, request);
    return ResponseEntity.created(URI.create("/api/admin/users/" + created.id())).body(created);
  }

  @PutMapping("/users/{id}/profile")
  public AdminUserResponse updateProfile(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody UpdateProfileRequest request) {
    return service.updateProfile(principal, id, request);
  }

  @PutMapping("/users/{id}/roles")
  public AdminUserResponse updateRoles(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody RolesRequest request) {
    return service.updateRoles(principal, id, request.roles());
  }

  @PutMapping("/users/{id}/manager")
  public AdminUserResponse assignManager(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @RequestBody ManagerAssignmentRequest request) {
    return service.assignManager(principal, id, request.managerId());
  }

  @PatchMapping("/users/{id}/status")
  public AdminUserResponse setStatus(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody StatusRequest request) {
    return service.setEnabled(principal, id, request.enabled());
  }

  @PostMapping("/users/{id}/reset-password")
  public TemporaryPasswordResponse resetPassword(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    return service.resetPassword(principal, id);
  }

  @GetMapping("/managers")
  public List<ManagerOption> managers() {
    return service.managers();
  }
}
