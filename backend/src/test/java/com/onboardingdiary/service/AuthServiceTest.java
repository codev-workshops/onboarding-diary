package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.LoginRequest;
import com.onboardingdiary.dto.request.RegisterRequest;
import com.onboardingdiary.dto.response.AuthResponse;
import com.onboardingdiary.dto.response.UserResponse;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .email("test@test.com")
                .passwordHash("encoded")
                .fullName("Test User")
                .role(Role.RECRUIT)
                .department("Engineering")
                .build();
    }

    @Test
    void register_newUser_returnsUserResponse() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("new@test.com");
        request.setPassword("Test1234!");
        request.setFullName("New User");
        request.setDepartment("Engineering");

        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(passwordEncoder.encode("Test1234!")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserResponse response = authService.register(request);

        assertNotNull(response);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_duplicateEmail_throwsBadRequest() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@test.com");

        when(userRepository.existsByEmail("existing@test.com")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_validCredentials_returnsAuthResponse() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("Test1234!");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(user));
        when(jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name()))
                .thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertNotNull(response.getUser());
    }

    @Test
    void login_invalidCredentials_throwsException() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("wrong");

        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }
}
