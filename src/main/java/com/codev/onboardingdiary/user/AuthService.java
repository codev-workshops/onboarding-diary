package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.Texts;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sign-up, login and logout backed by the HTTP session. */
@Service
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final SecurityContextRepository securityContextRepository;
  private final UserRules userRules;

  public AuthService(
      UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      SecurityContextRepository securityContextRepository,
      UserRules userRules) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.securityContextRepository = securityContextRepository;
    this.userRules = userRules;
  }

  @Transactional
  public UserDto signup(
      SignupRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    String email = Texts.normalizeEmail(request.email());
    if (userRepository.existsByEmail(email)) {
      throw ApiException.conflict("Email already registered");
    }
    userRules.validateStartDate(Role.RECRUIT, request.startDate());
    User user =
        new User(email, passwordEncoder.encode(request.password()), request.name(), Role.RECRUIT);
    user.setDepartment(Texts.trimToNull(request.department()));
    user.setStartDate(request.startDate());
    userRepository.save(user);
    startSession(user, httpRequest, httpResponse);
    return UserDto.of(user);
  }

  @Transactional(readOnly = true)
  public UserDto login(
      LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    User user =
        userRepository
            .findByEmail(Texts.normalizeEmail(request.email()))
            .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
            .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
    if (!user.isActive()) {
      throw ApiException.forbidden("Account is deactivated");
    }
    startSession(user, httpRequest, httpResponse);
    return UserDto.of(user);
  }

  public void logout(HttpServletRequest httpRequest) {
    SecurityContextHolder.clearContext();
    HttpSession session = httpRequest.getSession(false);
    if (session != null) {
      session.invalidate();
    }
  }

  private void startSession(
      User user, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
    if (httpRequest.getSession(false) != null) {
      httpRequest.changeSessionId();
    }
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(UserRefreshFilter.authenticationFor(user));
    SecurityContextHolder.setContext(context);
    securityContextRepository.saveContext(context, httpRequest, httpResponse);
  }
}
