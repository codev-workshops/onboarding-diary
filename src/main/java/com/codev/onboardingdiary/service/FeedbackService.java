package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Feedback;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.FeedbackRepository;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.FeedbackFilter;
import com.codev.onboardingdiary.web.dto.FeedbackForm;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class FeedbackService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"));

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    public FeedbackService(FeedbackRepository feedbackRepository,
                           UserRepository userRepository,
                           AuthorizationService authorizationService) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    public List<Feedback> list(AppUserDetails principal, Long ownerId, FeedbackFilter filter) {
        authorizationService.requireReadAccess(principal, ownerId);
        return feedbackRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public List<Feedback> listForOwner(Long ownerId, FeedbackFilter filter) {
        return feedbackRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public Feedback getForRead(AppUserDetails principal, Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Feedback not found"));
        authorizationService.requireReadAccess(principal, feedback.getUser());
        return feedback;
    }

    public Feedback getOwned(AppUserDetails principal, Long id) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Feedback not found"));
        authorizationService.requireOwnRecord(principal, feedback.getUser().getId());
        return feedback;
    }

    @Transactional
    public Feedback create(AppUserDetails principal, FeedbackForm form) {
        User owner = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        Feedback feedback = new Feedback();
        feedback.setUser(owner);
        apply(feedback, form);
        return feedbackRepository.save(feedback);
    }

    @Transactional
    public Feedback update(AppUserDetails principal, Long id, FeedbackForm form) {
        Feedback feedback = getOwned(principal, id);
        apply(feedback, form);
        return feedbackRepository.save(feedback);
    }

    @Transactional
    public void delete(AppUserDetails principal, Long id) {
        feedbackRepository.delete(getOwned(principal, id));
    }

    public long countAll(Long ownerId) {
        return feedbackRepository.countByUserId(ownerId);
    }

    public List<Feedback> searchText(Long ownerId, String query) {
        return feedbackRepository.searchText(ownerId, query);
    }

    private void apply(Feedback feedback, FeedbackForm form) {
        feedback.setDate(form.getDate());
        feedback.setSubject(form.getSubject().trim());
        feedback.setType(form.getType());
        feedback.setDetails(form.getDetails());
    }

    static Specification<Feedback> specification(Long ownerId, FeedbackFilter filter) {
        FeedbackFilter effective = filter == null ? FeedbackFilter.empty() : filter;
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), ownerId));
            if (effective.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), effective.from()));
            }
            if (effective.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), effective.to()));
            }
            if (effective.type() != null) {
                predicates.add(cb.equal(root.get("type"), effective.type()));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
