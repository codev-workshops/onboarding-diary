package com.codev.onboardingdiary.admin;

import com.codev.onboardingdiary.audit.AuditAction;
import com.codev.onboardingdiary.audit.AuditLogService;
import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.auth.RefreshTokenService;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.diary.DiaryEntries;
import com.codev.onboardingdiary.diary.PageResponse;
import com.codev.onboardingdiary.profile.UpdateProfileRequest;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserAccountService;
import com.codev.onboardingdiary.user.UserDto.ProfileDto;
import com.codev.onboardingdiary.user.UserRepository;
import jakarta.persistence.criteria.Join;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** User administration. Every change is written to the audit log. */
@Service
public class AdminUserService {

  private final UserRepository userRepository;
  private final ProfileRepository profileRepository;
  private final UserAccountService userAccountService;
  private final RefreshTokenService refreshTokenService;
  private final PasswordEncoder passwordEncoder;
  private final DiaryEntries diaryEntries;
  private final AuditLogService auditLog;
  private final Clock clock;

  public AdminUserService(
      UserRepository userRepository,
      ProfileRepository profileRepository,
      UserAccountService userAccountService,
      RefreshTokenService refreshTokenService,
      PasswordEncoder passwordEncoder,
      DiaryEntries diaryEntries,
      AuditLogService auditLog,
      Clock clock) {
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
    this.userAccountService = userAccountService;
    this.refreshTokenService = refreshTokenService;
    this.passwordEncoder = passwordEncoder;
    this.diaryEntries = diaryEntries;
    this.auditLog = auditLog;
    this.clock = clock;
  }

  /** Searches by name or email ({@code q}), department, role and enabled flag. */
  @Transactional(readOnly = true)
  public PageResponse<AdminUserResponse> list(
      String q, String department, Role role, Boolean enabled, Pageable pageable) {
    Specification<Profile> spec =
        Specification.<Profile>where(textMatch(q))
            .and(
                isBlank(department)
                    ? null
                    : (root, query, cb) ->
                        cb.equal(
                            cb.lower(root.get("department")),
                            department.trim().toLowerCase(Locale.ROOT)))
            .and(
                role == null
                    ? null
                    : (root, query, cb) -> {
                      Join<Object, Object> roles = root.join("user").join("roles");
                      return cb.equal(roles, role);
                    })
            .and(
                enabled == null
                    ? null
                    : (root, query, cb) -> cb.equal(root.get("user").get("enabled"), enabled));
    Pageable byName =
        PageRequest.of(
            pageable.getPageNumber(), pageable.getPageSize(), Sort.by("fullName", "userId"));
    return PageResponse.from(profileRepository.findAll(spec, byName).map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public AdminUserResponse get(Long id) {
    return toResponse(findProfile(id));
  }

  @Transactional(readOnly = true)
  public List<ManagerOption> managers() {
    return profileRepository.findByRole(Role.MANAGER).stream()
        .filter(profile -> profile.getUser().isEnabled())
        .map(p -> new ManagerOption(p.getUserId(), p.getFullName(), p.getUser().getEmail()))
        .toList();
  }

  @Transactional
  public AdminUserResponse create(AuthenticatedUser actor, CreateUserRequest request) {
    User manager = request.managerId() == null ? null : findManager(request.managerId(), null);
    Profile profile =
        userAccountService.createAccount(
            request.email(),
            request.temporaryPassword(),
            request.roles(),
            request.toProfileDetails());
    profile.getUser().setMustChangePassword(true);
    profile.setManager(manager);
    auditLog.record(
        actor.id(),
        AuditAction.USER_CREATED,
        profile.getUserId(),
        details(
            "email", profile.getUser().getEmail(),
            "roles", new TreeSet<>(request.roles()),
            "managerId", request.managerId()));
    return toResponse(profile);
  }

  /** Start date stays locked once the user has diary entries, as for self-service edits. */
  @Transactional
  public AdminUserResponse updateProfile(
      AuthenticatedUser actor, Long id, UpdateProfileRequest request) {
    Profile profile = findProfile(id);
    if (!request.startDate().equals(profile.getStartDate()) && diaryEntries.existFor(id)) {
      throw ApiException.invalidField(
          "startDate", "Start date cannot be changed once the user has diary entries");
    }
    profile.update(request.toProfileDetails());
    auditLog.record(
        actor.id(),
        AuditAction.PROFILE_UPDATED,
        id,
        details(
            "fullName", profile.getFullName(),
            "department", profile.getDepartment(),
            "startDate", profile.getStartDate().toString()));
    return toResponse(profile);
  }

  @Transactional
  public AdminUserResponse updateRoles(AuthenticatedUser actor, Long id, Set<Role> roles) {
    Profile profile = findProfile(id);
    User user = profile.getUser();
    Set<Role> before = new TreeSet<>(user.getRoles());
    boolean losesAdmin = before.contains(Role.ADMIN) && !roles.contains(Role.ADMIN);
    if (losesAdmin && id.equals(actor.id())) {
      throw ApiException.conflict("You cannot remove your own admin role");
    }
    if (losesAdmin && user.isEnabled() && userRepository.countEnabledWithRole(Role.ADMIN) <= 1) {
      throw ApiException.conflict("At least one active admin is required");
    }
    if (before.contains(Role.MANAGER)
        && !roles.contains(Role.MANAGER)
        && profileRepository.existsByManager_Id(id)) {
      throw ApiException.conflict("Reassign this manager's recruits before removing the role");
    }
    user.setRoles(roles);
    auditLog.record(
        actor.id(),
        AuditAction.ROLES_CHANGED,
        id,
        details("before", before, "after", new TreeSet<>(roles)));
    return toResponse(profile);
  }

  @Transactional
  public AdminUserResponse assignManager(AuthenticatedUser actor, Long id, Long managerId) {
    Profile profile = findProfile(id);
    User manager = managerId == null ? null : findManager(managerId, id);
    Long previous = profile.getManager() == null ? null : profile.getManager().getId();
    profile.setManager(manager);
    auditLog.record(
        actor.id(),
        AuditAction.MANAGER_ASSIGNED,
        id,
        details("previousManagerId", previous, "managerId", managerId));
    return toResponse(profile);
  }

  /** Disabling keeps all data, revokes sessions and blocks the account immediately. */
  @Transactional
  public AdminUserResponse setEnabled(AuthenticatedUser actor, Long id, boolean enabled) {
    Profile profile = findProfile(id);
    User user = profile.getUser();
    if (!enabled && id.equals(actor.id())) {
      throw ApiException.conflict("You cannot disable your own account");
    }
    if (!enabled
        && user.isEnabled()
        && user.getRoles().contains(Role.ADMIN)
        && userRepository.countEnabledWithRole(Role.ADMIN) <= 1) {
      throw ApiException.conflict("At least one active admin is required");
    }
    if (user.isEnabled() != enabled) {
      user.setEnabled(enabled);
      if (!enabled) {
        refreshTokenService.revokeAll(user);
      }
      auditLog.record(
          actor.id(), enabled ? AuditAction.USER_ENABLED : AuditAction.USER_DISABLED, id, null);
    }
    return toResponse(profile);
  }

  /** Issues a temporary password, ends all sessions and unlocks the account. */
  @Transactional
  public TemporaryPasswordResponse resetPassword(AuthenticatedUser actor, Long id) {
    User user = findProfile(id).getUser();
    String temporaryPassword = TemporaryPasswords.generate();
    user.resetPassword(passwordEncoder.encode(temporaryPassword));
    refreshTokenService.revokeAll(user);
    auditLog.record(actor.id(), AuditAction.PASSWORD_RESET, id, null);
    return new TemporaryPasswordResponse(temporaryPassword);
  }

  private User findManager(Long managerId, Long userId) {
    if (managerId.equals(userId)) {
      throw ApiException.invalidField("managerId", "A user cannot be their own manager");
    }
    return userRepository
        .findById(managerId)
        .filter(user -> user.isEnabled() && user.getRoles().contains(Role.MANAGER))
        .orElseThrow(
            () ->
                ApiException.invalidField("managerId", "Must be an active user with MANAGER role"));
  }

  private Profile findProfile(Long id) {
    return profileRepository
        .findById(id)
        .orElseThrow(() -> ApiException.notFound("User not found"));
  }

  private AdminUserResponse toResponse(Profile profile) {
    User user = profile.getUser();
    User manager = profile.getManager();
    String managerName =
        manager == null
            ? null
            : profileRepository.findFullNameByUserId(manager.getId()).orElse(null);
    return new AdminUserResponse(
        user.getId(),
        user.getEmail(),
        new TreeSet<>(user.getRoles()),
        user.isEnabled(),
        user.isMustChangePassword(),
        user.isLockedAt(clock.instant()),
        user.getLastLoginAt(),
        user.getCreatedAt(),
        ProfileDto.from(profile, managerName));
  }

  private static Specification<Profile> textMatch(String q) {
    if (isBlank(q)) {
      return null;
    }
    String pattern =
        "%" + q.trim().toLowerCase(Locale.ROOT).replace("%", "").replace("_", "") + "%";
    return (root, query, cb) ->
        cb.or(
            cb.like(cb.lower(root.get("fullName")), pattern),
            cb.like(cb.lower(root.get("user").get("email")), pattern));
  }

  private static Map<String, Object> details(Object... keyValues) {
    Map<String, Object> details = new HashMap<>();
    for (int i = 0; i < keyValues.length; i += 2) {
      if (Objects.nonNull(keyValues[i + 1])) {
        details.put((String) keyValues[i], keyValues[i + 1]);
      }
    }
    return details;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
