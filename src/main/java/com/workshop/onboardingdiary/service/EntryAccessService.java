package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.ManagerAssignmentRepository;
import com.workshop.onboardingdiary.repository.UserRepository;
import java.time.LocalDate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ownership and oversight decisions shared by the Task and Issue logs (REQUIREMENTS 4.2, 4.3, 6.2):
 * owners and Admins may write, Managers may only read the recruits assigned to them.
 */
@Service
public class EntryAccessService {

    private final UserRepository userRepository;
    private final ManagerAssignmentRepository managerAssignmentRepository;

    public EntryAccessService(UserRepository userRepository,
                              ManagerAssignmentRepository managerAssignmentRepository) {
        this.userRepository = userRepository;
        this.managerAssignmentRepository = managerAssignmentRepository;
    }

    public User requireUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalStateException("Authenticated user " + email + " no longer exists"));
    }

    /** Resolves the {@code userId} list parameter, which defaults to the caller. */
    @Transactional(readOnly = true)
    public User resolveListTarget(User caller, Long userId) {
        if (userId == null || userId.equals(caller.getId())) {
            return caller;
        }
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Not allowed to read entries of another user"));
        requireReadAccess(caller, target);
        return target;
    }

    /**
     * Resolves the manager whose team the manager dashboard covers (REQUIREMENTS 10.4), reusing the
     * 403-not-404 spirit of {@link #resolveListTarget}. The dashboard is Manager/Admin only, so a New
     * Recruit is always forbidden; a Manager only ever sees their own oversight scope, and only an
     * Admin may pass another {@code managerId}, which must reference an existing Manager or it is a
     * 403 exactly like an unknown or out-of-scope id.
     */
    @Transactional(readOnly = true)
    public User resolveManagerTarget(User caller, Long managerId) {
        if (caller.getRole() == Role.NEW_RECRUIT) {
            throw new AccessDeniedException("Not allowed to view a manager dashboard");
        }
        if (managerId == null || managerId.equals(caller.getId())) {
            return caller;
        }
        if (caller.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Not allowed to view another manager's dashboard");
        }
        User target = userRepository.findById(managerId)
                .orElseThrow(() -> new AccessDeniedException("Not allowed to view another manager's dashboard"));
        if (target.getRole() != Role.MANAGER) {
            throw new AccessDeniedException("Not allowed to view another manager's dashboard");
        }
        return target;
    }

    public void requireReadAccess(User caller, User owner) {
        if (caller.getId().equals(owner.getId()) || caller.getRole() == Role.ADMIN) {
            return;
        }
        if (caller.getRole() == Role.MANAGER
                && managerAssignmentRepository.existsByManagerIdAndRecruitId(caller.getId(), owner.getId())) {
            return;
        }
        throw new AccessDeniedException("Not allowed to read entries of another user");
    }

    /** Only the owner or an Admin may create, update or delete an entry; Managers are read-only. */
    public void requireWriteAccess(User caller, User owner) {
        if (caller.getId().equals(owner.getId()) || caller.getRole() == Role.ADMIN) {
            return;
        }
        throw new AccessDeniedException("Not allowed to modify entries of another user");
    }

    /** Entry dates may not be in the future nor precede the owner's start date (REQUIREMENTS 6.2). */
    public void validateEntryDate(LocalDate entryDate, User owner) {
        if (entryDate.isAfter(LocalDate.now())) {
            throw new FieldValidationException("entryDate", "Entry date may not be in the future");
        }
        if (entryDate.isBefore(owner.getStartDate())) {
            throw new FieldValidationException("entryDate", "Entry date may not be before the start date");
        }
    }
}
