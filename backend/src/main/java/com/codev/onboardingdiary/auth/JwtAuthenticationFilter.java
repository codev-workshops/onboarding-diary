package com.codev.onboardingdiary.auth;

import com.codev.onboardingdiary.user.User;
import com.codev.onboardingdiary.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates requests that carry a valid {@code Authorization: Bearer} token whose user still
 * exists and is enabled, so disabling an account takes effect immediately.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final String BEARER_PREFIX = "Bearer ";

  private final JwtService jwtService;
  private final UserRepository userRepository;

  public JwtAuthenticationFilter(JwtService jwtService, UserRepository userRepository) {
    this.jwtService = jwtService;
    this.userRepository = userRepository;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith(BEARER_PREFIX)) {
      jwtService
          .parse(header.substring(BEARER_PREFIX.length()))
          .flatMap(token -> userRepository.findById(token.id()))
          .filter(User::isEnabled)
          .map(
              account ->
                  new AuthenticatedUser(account.getId(), account.getEmail(), account.getRoles()))
          .ifPresent(
              user -> {
                var authorities =
                    user.roles().stream()
                        .map(role -> new SimpleGrantedAuthority(role.authority()))
                        .toList();
                SecurityContextHolder.getContext()
                    .setAuthentication(
                        new UsernamePasswordAuthenticationToken(user, null, authorities));
              });
    }
    chain.doFilter(request, response);
  }
}
