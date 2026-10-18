package com.codev.onboardingdiary.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Authentication endpoints. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;
  private final ProfileService profileService;

  public AuthController(AuthService authService, ProfileService profileService) {
    this.authService = authService;
    this.profileService = profileService;
  }

  @PostMapping("/signup")
  ResponseEntity<UserDto> signup(
      @Valid @RequestBody SignupRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    UserDto user = authService.signup(request, httpRequest, httpResponse);
    return ResponseEntity.created(URI.create("/api/profile")).body(user);
  }

  @PostMapping("/login")
  UserDto login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    return authService.login(request, httpRequest, httpResponse);
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout(HttpServletRequest httpRequest) {
    authService.logout(httpRequest);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  UserDto me() {
    return profileService.get();
  }

  /** Lets the SPA obtain a CSRF token (also set as the XSRF-TOKEN cookie). */
  @GetMapping("/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
  }
}
