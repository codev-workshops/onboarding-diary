package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Texts;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserDto;
import com.codev.onboardingdiary.user.UserRef;
import com.codev.onboardingdiary.user.UserRepository;
import com.codev.onboardingdiary.user.UserRules;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** User management for admins. Users are deactivated, never deleted. */
@Service
public class AdminUserService {

  private final UserRepository users;
  private final UserRules userRules;
  private final PasswordEncoder passwordEncoder;

  public AdminUserService(
      UserRepository users, UserRules userRules, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.userRules = userRules;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional(readOnly = true)
  public PageResponse<UserDto> list(String query, Role role, Boolean active, Pageable pageable) {
    Specification<User> spec =
        Specification.where(matches(query))
            .and(equalTo("role", role))
            .and(equalTo("active", active));
    return PageResponse.of(users.findAll(spec, pageable), UserDto::of);
  }

  @Transactional(readOnly = true)
  public UserDto get(Long id) {
    return UserDto.of(find(id));
  }

  @Transactional(readOnly = true)
  public List<UserRef> activeManagers() {
    return users.findByRoleAndActiveTrueOrderByNameAsc(Role.MANAGER).stream()
        .map(UserRef::of)
        .toList();
  }

  @Transactional
  public UserDto create(AdminUserCreateRequest request) {
    String email = Texts.normalizeEmail(request.email());
    if (users.existsByEmail(email)) {
      throw ApiException.conflict("An account with this email already exists");
    }
    userRules.validateStartDate(request.role(), request.startDate());
    User user =
        new User(email, passwordEncoder.encode(request.password()), request.name(), request.role());
    user.setDepartment(Texts.trimToNull(request.department()));
    user.setStartDate(request.startDate());
    user.setManager(resolveManager(request.role(), request.managerId()));
    return UserDto.of(users.save(user));
  }

  @Transactional
  public UserDto update(User actor, Long id, AdminUserUpdateRequest request) {
    User user = find(id);
    boolean active = request.active();
    if (user.getId().equals(actor.getId()) && !active) {
      throw ApiException.conflict("You cannot deactivate your own account");
    }
    boolean losesAdmin = user.hasRole(Role.ADMIN) && (request.role() != Role.ADMIN || !active);
    if (losesAdmin && user.isActive() && users.lockActiveByRole(Role.ADMIN).size() <= 1) {
      throw ApiException.conflict("At least one active admin is required");
    }
    boolean losesManager =
        user.hasRole(Role.MANAGER) && (request.role() != Role.MANAGER || !active);
    if (losesManager) {
      users.unassignRecruitsOf(user);
    }
    userRules.validateStartDate(request.role(), request.startDate());
    user.setManager(resolveManager(request.role(), request.managerId()));
    user.setName(request.name());
    user.setRole(request.role());
    user.setDepartment(Texts.trimToNull(request.department()));
    user.setStartDate(request.startDate());
    user.setActive(active);
    return UserDto.of(users.saveAndFlush(user));
  }

  @Transactional
  public void resetPassword(Long id, AdminPasswordRequest request) {
    find(id).setPasswordHash(passwordEncoder.encode(request.newPassword()));
  }

  private User find(Long id) {
    return users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
  }

  private User resolveManager(Role role, Long managerId) {
    if (managerId == null) {
      return null;
    }
    if (role != Role.RECRUIT) {
      throw ApiException.fieldError("managerId", "only recruits can have a manager");
    }
    return users
        .findById(managerId)
        .filter(manager -> manager.hasRole(Role.MANAGER) && manager.isActive())
        .orElseThrow(() -> ApiException.fieldError("managerId", "must be an active manager"));
  }

  private static Specification<User> matches(String rawQuery) {
    String query = Texts.trimToNull(rawQuery);
    if (query == null) {
      return null;
    }
    String pattern = "%" + query.toLowerCase(Locale.ROOT) + "%";
    return (root, q, cb) ->
        cb.or(cb.like(cb.lower(root.get("name")), pattern), cb.like(root.get("email"), pattern));
  }

  private static Specification<User> equalTo(String attribute, Object value) {
    return (root, q, cb) -> value == null ? null : cb.equal(root.get(attribute), value);
  }
}
