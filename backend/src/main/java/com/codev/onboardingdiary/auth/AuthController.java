package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.auth.dto.AuthResponse;
import com.codev.onboardingdiary.auth.dto.ChangePasswordRequest;
import com.codev.onboardingdiary.auth.dto.LoginRequest;
import com.codev.onboardingdiary.auth.dto.SignupRequest;
import com.codev.onboardingdiary.auth.dto.TokenResponse;
import com.codev.onboardingdiary.user.UserDto;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;
  private final RefreshCookieFactory cookies;
  private final OriginValidator originValidator;

  public AuthController(
      AuthService authService, RefreshCookieFactory cookies, OriginValidator originValidator) {
    this.authService = authService;
    this.cookies = cookies;
    this.originValidator = originValidator;
  }

  @PostMapping("/signup")
  public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
    AuthResult result = authService.signup(request);
    return ResponseEntity.created(URI.create("/api/auth/me"))
        .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
        .body(toResponse(result));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    AuthResult result = authService.login(request);
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
        .body(toResponse(result));
  }

  @PostMapping("/refresh")
  public ResponseEntity<TokenResponse> refresh(
      @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken,
      @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin) {
    originValidator.requireAllowed(origin);
    AuthResult result = authService.refresh(refreshToken);
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, cookies.create(result.refreshToken()).toString())
        .body(new TokenResponse(result.accessToken(), authService.accessTokenTtlSeconds()));
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(
      @CookieValue(name = RefreshCookieFactory.COOKIE_NAME, required = false) String refreshToken,
      @RequestHeader(name = HttpHeaders.ORIGIN, required = false) String origin) {
    originValidator.requireAllowed(origin);
    authService.logout(refreshToken);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, cookies.clear().toString())
        .build();
  }

  @GetMapping("/me")
  public UserDto me(@AuthenticationPrincipal AuthenticatedUser principal) {
    return authService.currentUser(principal.id());
  }

  @PutMapping("/password")
  public ResponseEntity<Void> changePassword(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody ChangePasswordRequest request) {
    String refreshToken = authService.changePassword(principal.id(), request);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, cookies.create(refreshToken).toString())
        .build();
  }

  private AuthResponse toResponse(AuthResult result) {
    return new AuthResponse(
        result.accessToken(), authService.accessTokenTtlSeconds(), result.user());
  }
}
