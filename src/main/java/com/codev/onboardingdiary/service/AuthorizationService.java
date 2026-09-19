package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Role;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single place where ownership and management scope are decided. Services call into this component
 * so that no controller can reach data by supplying an arbitrary identifier.
 */
@Service
public class AuthorizationService {

    private final UserRepository userRepository;

    public AuthorizationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Diary records may only be created, changed or removed by the user they belong to. */
    public void requireOwnRecord(AppUserDetails principal, Long ownerId) {
        if (principal == null || ownerId == null || !ownerId.equals(principal.getId())) {
            throw new AccessDeniedException("You may only modify your own diary records");
        }
    }

    /**
     * Read access: the user themselves, a manager of that user, or an admin.
     *
     * @return the user whose data is being read
     */
    @Transactional(readOnly = true)
    public User requireReadAccess(AppUserDetails principal, Long targetUserId) {
        if (principal == null || targetUserId == null) {
            throw new AccessDeniedException("Not allowed");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new AccessDeniedException("Not allowed"));
        return requireReadAccess(principal, target);
    }

    public User requireReadAccess(AppUserDetails principal, User target) {
        if (principal == null || target == null) {
            throw new AccessDeniedException("Not allowed");
        }
        if (target.getId().equals(principal.getId())) {
            return target;
        }
        if (principal.getRole() == Role.ADMIN) {
            return target;
        }
        if (principal.getRole() == Role.MANAGER
                && target.getManager() != null
                && principal.getId().equals(target.getManager().getId())) {
            return target;
        }
        throw new AccessDeniedException("You are not allowed to view this user's diary");
    }

    public void requireAdmin(AppUserDetails principal) {
        if (principal == null || principal.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Administrator role required");
        }
    }
}
