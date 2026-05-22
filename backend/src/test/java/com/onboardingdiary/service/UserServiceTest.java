package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.UpdateProfileRequest;
import com.onboardingdiary.dto.response.UserResponse;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.UnauthorizedException;
import com.onboardingdiary.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private User manager;
    private User recruit;

    @BeforeEach
    void setUp() {
        manager = User.builder()
                .id(UUID.randomUUID())
                .email("manager@test.com")
                .fullName("Test Manager")
                .role(Role.MANAGER)
                .department("Engineering")
                .build();

        recruit = User.builder()
                .id(UUID.randomUUID())
                .email("recruit@test.com")
                .fullName("Test Recruit")
                .role(Role.RECRUIT)
                .department("Engineering")
                .manager(manager)
                .build();
    }

    @Test
    void getUserById_existingUser_returnsUserResponse() {
        when(userRepository.findById(recruit.getId())).thenReturn(Optional.of(recruit));

        UserResponse response = userService.getUserById(recruit.getId());

        assertEquals(recruit.getEmail(), response.getEmail());
        assertEquals(recruit.getFullName(), response.getFullName());
    }

    @Test
    void getUserById_nonExistingUser_throwsResourceNotFoundException() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                userService.getUserById(UUID.randomUUID()));
    }

    @Test
    void updateProfile_updatesFields() {
        when(userRepository.findById(recruit.getId())).thenReturn(Optional.of(recruit));
        when(userRepository.save(any(User.class))).thenReturn(recruit);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Updated Name");
        request.setDepartment("New Dept");
        request.setStartDate(LocalDate.of(2026, 1, 1));

        UserResponse response = userService.updateProfile(recruit.getId(), request);

        assertNotNull(response);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void updateProfile_partialUpdate_onlyUpdatesProvidedFields() {
        when(userRepository.findById(recruit.getId())).thenReturn(Optional.of(recruit));
        when(userRepository.save(any(User.class))).thenReturn(recruit);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Only Name");

        userService.updateProfile(recruit.getId(), request);

        assertEquals("Engineering", recruit.getDepartment());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void getRecruitsForManager_returnsAssignedRecruits() {
        when(userRepository.findByManagerId(manager.getId())).thenReturn(List.of(recruit));

        List<UserResponse> recruits = userService.getRecruitsForManager(manager.getId());

        assertEquals(1, recruits.size());
        assertEquals(recruit.getEmail(), recruits.get(0).getEmail());
    }

    @Test
    void verifyManagerAccess_adminBypassesCheck() {
        assertDoesNotThrow(() ->
                userService.verifyManagerAccess(UUID.randomUUID(), "ADMIN", recruit.getId()));
    }

    @Test
    void verifyManagerAccess_managerWithAssignedRecruit_succeeds() {
        when(userRepository.findById(recruit.getId())).thenReturn(Optional.of(recruit));

        assertDoesNotThrow(() ->
                userService.verifyManagerAccess(manager.getId(), "MANAGER", recruit.getId()));
    }

    @Test
    void verifyManagerAccess_managerWithUnassignedRecruit_throwsUnauthorized() {
        User unassignedRecruit = User.builder()
                .id(UUID.randomUUID())
                .email("unassigned@test.com")
                .role(Role.RECRUIT)
                .build();
        when(userRepository.findById(unassignedRecruit.getId())).thenReturn(Optional.of(unassignedRecruit));

        assertThrows(UnauthorizedException.class, () ->
                userService.verifyManagerAccess(manager.getId(), "MANAGER", unassignedRecruit.getId()));
    }

    @Test
    void verifyManagerAccess_recruitRole_throwsUnauthorized() {
        assertThrows(UnauthorizedException.class, () ->
                userService.verifyManagerAccess(recruit.getId(), "RECRUIT", recruit.getId()));
    }
}
