package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.LoginRequest;
import com.workshop.onboardingdiary.dto.LoginResponse;
import com.workshop.onboardingdiary.dto.SignupRequest;
import com.workshop.onboardingdiary.dto.UserSummaryResponse;
import com.workshop.onboardingdiary.entity.Department;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.DepartmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import java.util.Locale;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sign-up and login (REQUIREMENTS US-R01, US-R02). */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       DepartmentRepository departmentRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public LoginResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new FieldValidationException("email", "An account with this email already exists");
        }

        Department department = resolveActiveDepartment(request.department());

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.NEW_RECRUIT);
        user.setDepartment(department);
        user.setStartDate(request.startDate());
        user.setActive(true);
        User saved = userRepository.save(user);

        String token = jwtService.issueToken(saved.getEmail(), saved.getRole());
        return LoginResponse.of(token, UserSummaryResponse.from(saved));
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email() == null ? "" : request.email().trim().toLowerCase(Locale.ROOT);
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException ex) {
            throw new InvalidCredentialsException();
        }
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(InvalidCredentialsException::new);
        String token = jwtService.issueToken(user.getEmail(), user.getRole());
        return LoginResponse.of(token, UserSummaryResponse.from(user));
    }

    private Department resolveActiveDepartment(String name) {
        Department department = departmentRepository.findByNameIgnoreCase(name.trim())
                .orElseThrow(() -> new FieldValidationException("department", "Unknown department"));
        if (!department.isActive()) {
            throw new FieldValidationException("department", "Department is not active");
        }
        return department;
    }
}
