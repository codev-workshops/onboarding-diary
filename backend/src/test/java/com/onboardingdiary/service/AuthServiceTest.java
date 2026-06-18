package com.onboardingdiary.service;

import com.onboardingdiary.dto.LoginRequest;
import com.onboardingdiary.dto.LoginResponse;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = TestUsers.recruit(5L, "alex@acme.com");
        user.setPasswordHash("hashed");
        user.setStatus(UserStatus.ACTIVE);
    }

    @Test
    void loginSucceedsWithValidCredentials() {
        when(userRepository.findByEmailIgnoreCase("alex@acme.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret12345", "hashed")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        LoginResponse response = authService.login(new LoginRequest("alex@acme.com", "secret12345"));

        assertThat(response.token()).isEqualTo("jwt-token");
        assertThat(response.expiresIn()).isEqualTo(3600L);
        assertThat(response.user().email()).isEqualTo("alex@acme.com");
        assertThat(response.user().role()).isEqualTo(Role.RECRUIT);
    }

    @Test
    void loginFailsWhenUserMissing() {
        when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nope@acme.com", "secret12345")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginFailsWhenPasswordWrong() {
        when(userRepository.findByEmailIgnoreCase("alex@acme.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(eq("wrong"), any())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("alex@acme.com", "wrong")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void loginFailsWhenAccountNotActive() {
        user.setStatus(UserStatus.DISABLED);
        when(userRepository.findByEmailIgnoreCase("alex@acme.com")).thenReturn(Optional.of(user));
        lenient().when(passwordEncoder.matches("secret12345", "hashed")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(new LoginRequest("alex@acme.com", "secret12345")))
                .isInstanceOf(BadCredentialsException.class);
    }
}
