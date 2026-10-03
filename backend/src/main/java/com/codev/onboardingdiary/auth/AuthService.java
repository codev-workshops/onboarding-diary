package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.auth.dto.ChangePasswordRequest;
import com.codev.onboardingdiary.auth.dto.LoginRequest;
import com.codev.onboardingdiary.auth.dto.SignupRequest;
import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.config.AppProperties;
import com.codev.onboardingdiary.user.Profile;
import com.codev.onboardingdiary.user.ProfileRepository;
import com.codev.onboardingdiary.user.Role;
import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserAccountService;
import com.codev.onboardingdiary.user.UserDto;
import com.codev.onboardingdiary.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Signup, login, token refresh and password management. */
@Service
public class AuthService {

  private static final String INVALID_CREDENTIALS = "Invalid email or password";

  private final UserRepository userRepository;
  private final ProfileRepository profileRepository;
  private final UserAccountService userAccountService;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final RefreshTokenService refreshTokenService;
  private final AppProperties properties;
  private final Clock clock;

  public AuthService(
      UserRepository userRepository,
      ProfileRepository profileRepository,
      UserAccountService userAccountService,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      RefreshTokenService refreshTokenService,
      AppProperties properties,
      Clock clock) {
    this.userRepository = userRepository;
    this.profileRepository = profileRepository;
    this.userAccountService = userAccountService;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.refreshTokenService = refreshTokenService;
    this.properties = properties;
    this.clock = clock;
  }

  @Transactional
  public AuthResult signup(SignupRequest request) {
    String email = UserAccountService.normalizeEmail(request.email());
    requireAllowedDomain(email);
    Profile profile =
        userAccountService.createAccount(
            email, request.password(), Set.of(Role.RECRUIT), request.toProfileDetails());
    User user = profile.getUser();
    user.registerSuccessfulLogin(clock.instant());
    return issueTokens(user, profile);
  }

  @Transactional(noRollbackFor = ApiException.class)
  public AuthResult login(LoginRequest request) {
    Instant now = clock.instant();
    User user =
        userRepository
            .findByEmail(UserAccountService.normalizeEmail(request.email()))
            .orElseThrow(() -> ApiException.unauthorized(INVALID_CREDENTIALS));
    if (user.isLockedAt(now)) {
      throw ApiException.locked("Too many failed login attempts. Try again later.");
    }
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      user.registerFailedLogin(
          properties.maxFailedLogins(), now.plus(properties.lockoutDuration()));
      throw ApiException.unauthorized(INVALID_CREDENTIALS);
    }
    if (!user.isEnabled()) {
      throw ApiException.forbidden("Account is disabled. Contact an administrator.");
    }
    user.registerSuccessfulLogin(now);
    return issueTokens(user, findProfile(user.getId()));
  }

  /** Rotates the refresh token and issues a new access token. */
  @Transactional(noRollbackFor = ApiException.class)
  public AuthResult refresh(String rawRefreshToken) {
    if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
      throw ApiException.unauthorized("Missing refresh token");
    }
    User user = refreshTokenService.consume(rawRefreshToken);
    return issueTokens(user, findProfile(user.getId()));
  }

  @Transactional
  public void logout(String rawRefreshToken) {
    if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
      refreshTokenService.revoke(rawRefreshToken);
    }
  }

  /** Changes the password, revokes all sessions and returns a fresh refresh token. */
  @Transactional
  public String changePassword(Long userId, ChangePasswordRequest request) {
    User user = findUser(userId);
    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw ApiException.badRequest("Current password is incorrect");
    }
    if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
      throw ApiException.badRequest("New password must differ from the current password");
    }
    user.changePassword(passwordEncoder.encode(request.newPassword()));
    refreshTokenService.revokeAll(user);
    return refreshTokenService.issue(user);
  }

  @Transactional(readOnly = true)
  public UserDto currentUser(Long userId) {
    return UserDto.from(findUser(userId), findProfile(userId));
  }

  public long accessTokenTtlSeconds() {
    return jwtService.accessTokenTtlSeconds();
  }

  private AuthResult issueTokens(User user, Profile profile) {
    return new AuthResult(
        jwtService.createAccessToken(user),
        refreshTokenService.issue(user),
        UserDto.from(user, profile));
  }

  private void requireAllowedDomain(String email) {
    if (properties.allowedEmailDomains().isEmpty()) {
      return;
    }
    String domain = email.substring(email.indexOf('@') + 1);
    if (!properties.allowedEmailDomains().contains(domain)) {
      throw ApiException.badRequest("Sign-up is not allowed for this email domain");
    }
  }

  private User findUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> ApiException.unauthorized("User no longer exists"));
  }

  private Profile findProfile(Long userId) {
    return profileRepository
        .findById(userId)
        .orElseThrow(() -> ApiException.notFound("Profile not found"));
  }
}
