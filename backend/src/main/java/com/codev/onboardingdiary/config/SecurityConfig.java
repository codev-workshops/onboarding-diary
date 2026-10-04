package com.codev.onboardingdiary.config;

import com.codev.onboardingdiary.auth.JwtAuthenticationFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/** Stateless JWT security with role-based access rules. */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  private static final int BCRYPT_STRENGTH = 12;

  private static final String[] PUBLIC_ENDPOINTS = {
    "/api/auth/signup",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/actuator/health",
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/swagger-ui.html"
  };

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
  }

  @Bean
  @Order(2)
  SecurityFilterChain apiSecurityFilterChain(
      HttpSecurity http, JwtAuthenticationFilter jwtFilter, ObjectMapper objectMapper)
      throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .headers(
            headers ->
                headers
                    .frameOptions(frame -> frame.deny())
                    .contentSecurityPolicy(
                        csp -> csp.policyDirectives("default-src 'self'; frame-ancestors 'none'"))
                    .referrerPolicy(
                        referrer ->
                            referrer.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy
                                    .STRICT_ORIGIN_WHEN_CROSS_ORIGIN)))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(PUBLIC_ENDPOINTS)
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/manager/**", "/api/dashboard/team")
                    .hasAnyRole("MANAGER", "ADMIN")
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, ex) ->
                            writeProblem(
                                response,
                                objectMapper,
                                HttpStatus.UNAUTHORIZED,
                                "Authentication is required"))
                    .accessDeniedHandler(
                        (request, response, ex) ->
                            writeProblem(
                                response,
                                objectMapper,
                                HttpStatus.FORBIDDEN,
                                "You do not have permission to access this resource")))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  /** Allows the H2 console in the dev profile only. */
  @Bean
  @Order(1)
  @Profile("dev")
  SecurityFilterChain h2ConsoleSecurityFilterChain(HttpSecurity http) throws Exception {
    http.securityMatcher(PathRequest.toH2Console())
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .csrf(AbstractHttpConfigurer::disable)
        .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()));
    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(properties.corsOrigins());
    config.addAllowedMethod("*");
    config.addAllowedHeader("*");
    config.addExposedHeader("Content-Disposition");
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
  }

  private static void writeProblem(
      HttpServletResponse response, ObjectMapper objectMapper, HttpStatus status, String detail)
      throws IOException {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setTitle(status.getReasonPhrase());
    response.setStatus(status.value());
    response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), problem);
  }
}
