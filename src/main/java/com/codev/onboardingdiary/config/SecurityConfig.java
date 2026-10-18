package com.codev.onboardingdiary.config;

import com.codev.onboardingdiary.common.ApiErrors;
import com.codev.onboardingdiary.user.UserRefreshFilter;
import com.codev.onboardingdiary.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

/** Session-cookie authentication with CSRF protection for the SPA and JSON API. */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  SecurityContextRepository securityContextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      SecurityContextRepository securityContextRepository,
      UserRepository userRepository,
      ObjectMapper objectMapper)
      throws Exception {
    http.securityContext(context -> context.securityContextRepository(securityContextRepository))
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .csrf(
            csrf ->
                csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
        .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)
        .addFilterBefore(new UserRefreshFilter(userRepository), AuthorizationFilter.class)
        .formLogin(form -> form.disable())
        .httpBasic(basic -> basic.disable())
        .logout(logout -> logout.disable())
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, ex) ->
                            writeError(
                                objectMapper,
                                response,
                                HttpStatus.UNAUTHORIZED,
                                "Authentication required",
                                request))
                    .accessDeniedHandler(
                        (request, response, ex) ->
                            writeError(
                                objectMapper, response, HttpStatus.FORBIDDEN, "Access denied",
                                request)))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/api/health", "/api/auth/signup", "/api/auth/login", "/api/auth/csrf")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/auth/logout")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/recruits/**")
                    .hasAnyRole("MANAGER", "ADMIN")
                    .requestMatchers(
                        "/api/tasks/**",
                        "/api/issues/**",
                        "/api/feedback/**",
                        "/api/notes/**",
                        "/api/dashboard/**")
                    .hasRole("RECRUIT")
                    .requestMatchers("/api/**")
                    .authenticated()
                    .anyRequest()
                    .permitAll());
    return http.build();
  }

  private static void writeError(
      ObjectMapper objectMapper,
      HttpServletResponse response,
      HttpStatus status,
      String message,
      jakarta.servlet.http.HttpServletRequest request)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), ApiErrors.of(status, message, request));
  }
}
