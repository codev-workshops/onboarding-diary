package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Issue;
import com.codev.onboardingdiary.domain.IssueStatus;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.IssueRepository;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.IssueFilter;
import com.codev.onboardingdiary.web.dto.IssueForm;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class IssueService {

    public static final List<IssueStatus> OPEN_STATUSES = List.of(IssueStatus.OPEN, IssueStatus.IN_PROGRESS);

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"));

    private final IssueRepository issueRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    public IssueService(IssueRepository issueRepository,
                        UserRepository userRepository,
                        AuthorizationService authorizationService) {
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    public List<Issue> list(AppUserDetails principal, Long ownerId, IssueFilter filter) {
        authorizationService.requireReadAccess(principal, ownerId);
        return issueRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public List<Issue> listForOwner(Long ownerId, IssueFilter filter) {
        return issueRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public Issue getForRead(AppUserDetails principal, Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Issue not found"));
        authorizationService.requireReadAccess(principal, issue.getUser());
        return issue;
    }

    public Issue getOwned(AppUserDetails principal, Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Issue not found"));
        authorizationService.requireOwnRecord(principal, issue.getUser().getId());
        return issue;
    }

    @Transactional
    public Issue create(AppUserDetails principal, IssueForm form) {
        User owner = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        Issue issue = new Issue();
        issue.setUser(owner);
        apply(issue, form);
        return issueRepository.save(issue);
    }

    @Transactional
    public Issue update(AppUserDetails principal, Long id, IssueForm form) {
        Issue issue = getOwned(principal, id);
        apply(issue, form);
        return issueRepository.save(issue);
    }

    @Transactional
    public void delete(AppUserDetails principal, Long id) {
        issueRepository.delete(getOwned(principal, id));
    }

    public long countOpen(Long ownerId) {
        return issueRepository.countByUserIdAndStatusIn(ownerId, OPEN_STATUSES);
    }

    public long countAll(Long ownerId) {
        return issueRepository.countByUserId(ownerId);
    }

    public List<Issue> searchText(Long ownerId, String query) {
        return issueRepository.searchText(ownerId, query);
    }

    private void apply(Issue issue, IssueForm form) {
        issue.setDate(form.getDate());
        issue.setTitle(form.getTitle().trim());
        issue.setDescription(form.getDescription());
        issue.setSeverity(form.getSeverity());
        issue.setStatus(form.getStatus());
        issue.setResolutionNotes(form.getResolutionNotes());
    }

    static Specification<Issue> specification(Long ownerId, IssueFilter filter) {
        IssueFilter effective = filter == null ? IssueFilter.empty() : filter;
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), ownerId));
            if (effective.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), effective.from()));
            }
            if (effective.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), effective.to()));
            }
            if (effective.status() != null) {
                predicates.add(cb.equal(root.get("status"), effective.status()));
            }
            if (effective.severity() != null) {
                predicates.add(cb.equal(root.get("severity"), effective.severity()));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
