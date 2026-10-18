package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Paging;
import com.codev.onboardingdiary.user.CurrentUser;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.UserDto;
import com.codev.onboardingdiary.user.UserRef;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only user management; access is enforced in {@code SecurityConfig}. */
@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

  private static final Sort BY_NAME = Sort.by("name", "id");

  private final AdminUserService service;
  private final CurrentUser currentUser;

  public AdminUserController(AdminUserService service, CurrentUser currentUser) {
    this.service = service;
    this.currentUser = currentUser;
  }

  @GetMapping("/users")
  PageResponse<UserDto> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Role role,
      @RequestParam(required = false) Boolean active,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return service.list(q, role, active, Paging.of(page, size, BY_NAME));
  }

  @GetMapping("/users/{id}")
  UserDto get(@PathVariable Long id) {
    return service.get(id);
  }

  @PostMapping("/users")
  ResponseEntity<UserDto> create(@Valid @RequestBody AdminUserCreateRequest request) {
    UserDto created = service.create(request);
    return ResponseEntity.created(URI.create("/api/admin/users/" + created.id())).body(created);
  }

  @PutMapping("/users/{id}")
  UserDto update(@PathVariable Long id, @Valid @RequestBody AdminUserUpdateRequest request) {
    return service.update(currentUser.get(), id, request);
  }

  @PutMapping("/users/{id}/password")
  ResponseEntity<Void> resetPassword(
      @PathVariable Long id, @Valid @RequestBody AdminPasswordRequest request) {
    service.resetPassword(id, request);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/managers")
  List<UserRef> managers() {
    return service.activeManagers();
  }
}
