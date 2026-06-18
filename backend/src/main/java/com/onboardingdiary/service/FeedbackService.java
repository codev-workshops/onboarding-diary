package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateFeedbackRequest;
import com.onboardingdiary.dto.FeedbackFilter;
import com.onboardingdiary.dto.FeedbackResponse;
import com.onboardingdiary.dto.UpdateFeedbackRequest;
import com.onboardingdiary.entity.Feedback;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.FeedbackRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    public FeedbackService(FeedbackRepository feedbackRepository, UserRepository userRepository) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public FeedbackResponse create(AuthenticatedUser caller, CreateFeedbackRequest request) {
        Feedback feedback = new Feedback();
        feedback.setOwnerId(caller.id());
        feedback.setDate(request.date());
        feedback.setSubject(request.subject().trim());
        feedback.setType(request.type());
        feedback.setDetails(trimToNull(request.details()));
        return FeedbackResponse.from(feedbackRepository.save(feedback));
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> list(AuthenticatedUser caller, FeedbackFilter filter, Pageable pageable) {
        Set<Long> allowedOwnerIds = visibleOwnerIds(caller);
        Long ownerFilter = filter.ownerId();

        if (ownerFilter != null && allowedOwnerIds != null && !allowedOwnerIds.contains(ownerFilter)) {
            throw new AccessDeniedException("Not allowed to view this user's feedback");
        }

        Specification<Feedback> spec = buildSpecification(allowedOwnerIds, ownerFilter, filter);
        return feedbackRepository.findAll(spec, pageable).map(FeedbackResponse::from);
    }

    @Transactional(readOnly = true)
    public FeedbackResponse get(AuthenticatedUser caller, Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));
        if (!canRead(caller, feedback)) {
            // 404 rather than 403 to avoid disclosing existence of others' feedback.
            throw new ResourceNotFoundException("Feedback not found");
        }
        return FeedbackResponse.from(feedback);
    }

    @Transactional
    public FeedbackResponse update(AuthenticatedUser caller, Long id, UpdateFeedbackRequest request) {
        Feedback feedback = loadOwnedFeedback(caller, id);
        feedback.setDate(request.date());
        feedback.setSubject(request.subject().trim());
        feedback.setType(request.type());
        feedback.setDetails(trimToNull(request.details()));
        return FeedbackResponse.from(feedbackRepository.save(feedback));
    }

    @Transactional
    public void delete(AuthenticatedUser caller, Long id) {
        Feedback feedback = loadOwnedFeedback(caller, id);
        feedbackRepository.delete(feedback);
    }

    /**
     * Loads a feedback note the caller may modify (owner only). Returns 404 for
     * both missing and non-owned notes to avoid existence disclosure.
     */
    private Feedback loadOwnedFeedback(AuthenticatedUser caller, Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found"));
        if (!caller.id().equals(feedback.getOwnerId())) {
            throw new ResourceNotFoundException("Feedback not found");
        }
        return feedback;
    }

    private boolean canRead(AuthenticatedUser caller, Feedback feedback) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return true;
        }
        if (caller.id().equals(feedback.getOwnerId())) {
            return true;
        }
        if (role == Role.MANAGER) {
            User owner = userRepository.findById(feedback.getOwnerId()).orElse(null);
            return owner != null && caller.id().equals(owner.getManagerId());
        }
        return false;
    }

    /**
     * The set of owner ids the caller may view, or {@code null} for unrestricted
     * (admin) access.
     */
    private Set<Long> visibleOwnerIds(AuthenticatedUser caller) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return null;
        }
        Set<Long> ids = new HashSet<>();
        ids.add(caller.id());
        if (role == Role.MANAGER) {
            ids.addAll(userRepository.findIdsByManagerId(caller.id()));
        }
        return ids;
    }

    private Specification<Feedback> buildSpecification(Set<Long> allowedOwnerIds, Long ownerFilter, FeedbackFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (ownerFilter != null) {
                predicates.add(cb.equal(root.get("ownerId"), ownerFilter));
            } else if (allowedOwnerIds != null) {
                predicates.add(root.get("ownerId").in(allowedOwnerIds));
            }

            if (filter.type() != null) {
                predicates.add(cb.equal(root.get("type"), filter.type()));
            }
            if (filter.dateFrom() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), filter.dateFrom()));
            }
            if (filter.dateTo() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), filter.dateTo()));
            }
            if (filter.search() != null && !filter.search().isBlank()) {
                String like = "%" + filter.search().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("subject")), like),
                        cb.like(cb.lower(root.get("details")), like)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
