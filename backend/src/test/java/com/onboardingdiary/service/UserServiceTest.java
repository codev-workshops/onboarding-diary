package com.onboardingdiary.service;

import com.onboardingdiary.dto.AdminUpdateUserRequest;
import com.onboardingdiary.dto.CreateUserRequest;
import com.onboardingdiary.dto.UpdateProfileRequest;
import com.onboardingdiary.dto.UserResponse;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.entity.UserStatus;
import com.onboardingdiary.exception.ConflictException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.exception.ValidationException;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private AuthenticatedUser adminPrincipal() {
        return new AuthenticatedUser(1L, "admin@acme.com", "ADMIN");
    }

    private AuthenticatedUser managerPrincipal(long id) {
        return new AuthenticatedUser(id, "mgr@acme.com", "MANAGER");
    }

    private AuthenticatedUser recruitPrincipal(long id) {
        return new AuthenticatedUser(id, "rec@acme.com", "RECRUIT");
    }

    @Test
    void createHashesPasswordAndPersists() {
        CreateUserRequest request = new CreateUserRequest(
                "Alex", "alex@acme.com", Role.RECRUIT, "password123", "Engineering", null, null);
        when(userRepository.existsByEmailIgnoreCase("alex@acme.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            TestUsers.setId(u, 10L);
            return u;
        });

        UserResponse response = userService.create(request);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.email()).isEqualTo("alex@acme.com");
        verify(passwordEncoder).encode("password123");
    }

    @Test
    void createRejectsDuplicateEmail() {
        CreateUserRequest request = new CreateUserRequest(
                "Alex", "alex@acme.com", Role.RECRUIT, "password123", null, null, null);
        when(userRepository.existsByEmailIgnoreCase("alex@acme.com")).thenReturn(true);

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ConflictException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void createRejectsRecruitAsManager() {
        User recruitManager = TestUsers.recruit(7L, "boss@acme.com");
        CreateUserRequest request = new CreateUserRequest(
                "Alex", "alex@acme.com", Role.RECRUIT, "password123", null, null, 7L);
        when(userRepository.existsByEmailIgnoreCase("alex@acme.com")).thenReturn(false);
        when(userRepository.findById(7L)).thenReturn(Optional.of(recruitManager));

        assertThatThrownBy(() -> userService.create(request))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void recruitCanReadOwnRecord() {
        User self = TestUsers.recruit(5L, "rec@acme.com");
        when(userRepository.findById(5L)).thenReturn(Optional.of(self));

        UserResponse response = userService.get(recruitPrincipal(5L), 5L);

        assertThat(response.id()).isEqualTo(5L);
    }

    @Test
    void recruitCannotReadOthersRecord() {
        User other = TestUsers.recruit(6L, "other@acme.com");
        when(userRepository.findById(6L)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> userService.get(recruitPrincipal(5L), 6L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void managerCanReadAssignedRecruitButNotOthers() {
        User assigned = TestUsers.recruit(6L, "assigned@acme.com");
        assigned.setManagerId(2L);
        User unassigned = TestUsers.recruit(7L, "unassigned@acme.com");
        unassigned.setManagerId(99L);
        when(userRepository.findById(6L)).thenReturn(Optional.of(assigned));
        when(userRepository.findById(7L)).thenReturn(Optional.of(unassigned));

        assertThat(userService.get(managerPrincipal(2L), 6L).id()).isEqualTo(6L);
        assertThatThrownBy(() -> userService.get(managerPrincipal(2L), 7L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void recruitCannotListUsers() {
        assertThatThrownBy(() -> userService.list(recruitPrincipal(5L), null, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void updateOwnProfileChangesNameAndDepartmentOnly() {
        User self = TestUsers.recruit(5L, "rec@acme.com");
        self.setRole(Role.RECRUIT);
        when(userRepository.findById(5L)).thenReturn(Optional.of(self));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        UserResponse response = userService.updateOwnProfile(
                recruitPrincipal(5L), new UpdateProfileRequest("New Name", "Platform"));

        assertThat(response.name()).isEqualTo("New Name");
        assertThat(response.department()).isEqualTo("Platform");
        assertThat(response.role()).isEqualTo(Role.RECRUIT);
    }

    @Test
    void adminUpdateRejectsSelfManager() {
        User target = TestUsers.recruit(8L, "t@acme.com");
        when(userRepository.findById(8L)).thenReturn(Optional.of(target));

        AdminUpdateUserRequest request = new AdminUpdateUserRequest(
                "T", Role.RECRUIT, UserStatus.ACTIVE, null, null, 8L);

        assertThatThrownBy(() -> userService.adminUpdate(8L, request))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void disableSetsStatusDisabled() {
        User target = TestUsers.recruit(8L, "t@acme.com");
        when(userRepository.findById(8L)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.disable(8L);

        assertThat(target.getStatus()).isEqualTo(UserStatus.DISABLED);
    }
}
