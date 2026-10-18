package com.codev.onboardingdiary.user;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Re-reads the logged-in user on every request so deactivation and role changes take effect
 * immediately, even for existing sessions.
 */
public class UserRefreshFilter extends OncePerRequestFilter {

  private final UserRepository userRepository;

  public UserRefreshFilter(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    SecurityContext context = SecurityContextHolder.getContext();
    Authentication authentication = context.getAuthentication();
    if (authentication != null && authentication.getPrincipal() instanceof AuthPrincipal principal) {
      Optional<User> user = userRepository.findById(principal.userId()).filter(User::isActive);
      if (user.isEmpty()) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
          session.invalidate();
        }
      } else {
        context.setAuthentication(authenticationFor(user.get()));
      }
    }
    filterChain.doFilter(request, response);
  }

  static Authentication authenticationFor(User user) {
    return UsernamePasswordAuthenticationToken.authenticated(
        new AuthPrincipal(user.getId(), user.getEmail()),
        null,
        List.of(new SimpleGrantedAuthority(user.getRole().authority())));
  }
}
