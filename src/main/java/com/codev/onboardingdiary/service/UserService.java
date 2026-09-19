package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.AdminUserForm;
import com.codev.onboardingdiary.web.dto.ProfileForm;
import com.codev.onboardingdiary.web.dto.SignupForm;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthorizationService authorizationService;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthorizationService authorizationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authorizationService = authorizationService;
    }

    public User getById(Long id) {
        return userRepository.findWithManagerById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    public User getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalize(email))
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    /** Public self-registration; always creates a RECRUIT, regardless of anything the client sends. */
    @Transactional
    public User register(SignupForm form) {
        String email = normalize(form.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyUsedException("Email is already registered");
        }
        User user = new User();
        user.setName(form.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(form.getPassword()));
        user.setRole(Role.RECRUIT);
        user.setDepartment(trimToNull(form.getDepartment()));
        user.setStartDate(form.getStartDate());
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        return userRepository.save(user);
    }

    @Transactional
    public User createByAdmin(AppUserDetails principal, AdminUserForm form) {
        authorizationService.requireAdmin(principal);
        String email = normalize(form.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyUsedException("Email is already registered");
        }
        User user = new User();
        user.setName(form.getName().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(form.getPassword()));
        user.setRole(form.getRole());
        user.setDepartment(trimToNull(form.getDepartment()));
        user.setStartDate(form.getStartDate());
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        applyManager(user, form.getManagerId());
        return userRepository.save(user);
    }

    @Transactional
    public User updateProfile(AppUserDetails principal, ProfileForm form) {
        User user = getById(principal.getId());
        user.setName(form.getName().trim());
        user.setDepartment(trimToNull(form.getDepartment()));
        user.setStartDate(form.getStartDate());
        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(AppUserDetails principal, String currentPassword, String newPassword) {
        User user = getById(principal.getId());
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void setActive(AppUserDetails principal, Long userId, boolean active) {
        authorizationService.requireAdmin(principal);
        if (!active && principal.getId().equals(userId)) {
            throw new IllegalArgumentException("You cannot deactivate your own account");
        }
        User user = getById(userId);
        user.setActive(active);
        userRepository.save(user);
    }

    @Transactional
    public void assignManager(AppUserDetails principal, Long recruitId, Long managerId) {
        authorizationService.requireAdmin(principal);
        User recruit = getById(recruitId);
        if (recruit.getRole() != Role.RECRUIT) {
            throw new IllegalArgumentException("Only recruits can be assigned to a manager");
        }
        applyManager(recruit, managerId);
        userRepository.save(recruit);
    }

    public List<User> findAll(AppUserDetails principal) {
        authorizationService.requireAdmin(principal);
        return userRepository.findAllWithManagerByOrderByNameAsc();
    }

    public List<User> findManagers() {
        return userRepository.findActiveByRole(Role.MANAGER);
    }

    /** Users whose diary the principal may read: self for recruits, the team for managers, all for admins. */
    public List<User> findViewableRecruits(AppUserDetails principal) {
        return switch (principal.getRole()) {
            case ADMIN -> userRepository.findByRoleOrderByNameAsc(Role.RECRUIT);
            case MANAGER -> userRepository.findByManagerIdOrderByNameAsc(principal.getId());
            case RECRUIT -> List.of();
        };
    }

    /** Users the principal may report on, including themselves. */
    public List<User> findReportableUsers(AppUserDetails principal) {
        return switch (principal.getRole()) {
            case ADMIN -> userRepository.findAllByOrderByNameAsc();
            case MANAGER -> {
                List<User> team = new java.util.ArrayList<>(userRepository.findByManagerIdOrderByNameAsc(principal.getId()));
                team.add(0, getById(principal.getId()));
                yield team;
            }
            case RECRUIT -> List.of(getById(principal.getId()));
        };
    }

    private void applyManager(User recruit, Long managerId) {
        if (managerId == null) {
            recruit.setManager(null);
            return;
        }
        User manager = getById(managerId);
        if (manager.getRole() != Role.MANAGER) {
            throw new IllegalArgumentException("Selected user is not a manager");
        }
        if (manager.getId().equals(recruit.getId())) {
            throw new IllegalArgumentException("A user cannot manage themselves");
        }
        recruit.setManager(manager);
    }

    void requireSelf(AppUserDetails principal, Long userId) {
        if (!principal.getId().equals(userId)) {
            throw new AccessDeniedException("Not allowed");
        }
    }

    private static String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
