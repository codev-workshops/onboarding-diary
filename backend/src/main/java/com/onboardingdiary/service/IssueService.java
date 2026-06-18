package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateIssueRequest;
import com.onboardingdiary.dto.IssueFilter;
import com.onboardingdiary.dto.IssueResponse;
import com.onboardingdiary.dto.UpdateIssueRequest;
import com.onboardingdiary.entity.Issue;
import com.onboardingdiary.entity.IssueSeverity;
import com.onboardingdiary.entity.IssueStatus;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.IssueRepository;
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
public class IssueService {

    private final IssueRepository issueRepository;
    private final UserRepository userRepository;

    public IssueService(IssueRepository issueRepository, UserRepository userRepository) {
        this.issueRepository = issueRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public IssueResponse create(AuthenticatedUser caller, CreateIssueRequest request) {
        Issue issue = new Issue();
        issue.setOwnerId(caller.id());
        issue.setDate(request.date());
        issue.setTitle(request.title().trim());
        issue.setDescription(trimToNull(request.description()));
        issue.setSeverity(request.severity());
        issue.setStatus(request.status() != null ? request.status() : IssueStatus.OPEN);
        issue.setResolutionNotes(trimToNull(request.resolutionNotes()));
        return IssueResponse.from(issueRepository.save(issue));
    }

    @Transactional(readOnly = true)
    public Page<IssueResponse> list(AuthenticatedUser caller, IssueFilter filter, Pageable pageable) {
        Set<Long> allowedOwnerIds = visibleOwnerIds(caller);
        Long ownerFilter = filter.ownerId();

        if (ownerFilter != null && allowedOwnerIds != null && !allowedOwnerIds.contains(ownerFilter)) {
            throw new AccessDeniedException("Not allowed to view this user's issues");
        }

        Specification<Issue> spec = buildSpecification(allowedOwnerIds, ownerFilter, filter);
        return issueRepository.findAll(spec, pageable).map(IssueResponse::from);
    }

    @Transactional(readOnly = true)
    public IssueResponse get(AuthenticatedUser caller, Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));
        if (!canRead(caller, issue)) {
            // 404 rather than 403 to avoid disclosing existence of others' issues.
            throw new ResourceNotFoundException("Issue not found");
        }
        return IssueResponse.from(issue);
    }

    @Transactional
    public IssueResponse update(AuthenticatedUser caller, Long id, UpdateIssueRequest request) {
        Issue issue = loadOwnedIssue(caller, id);
        issue.setDate(request.date());
        issue.setTitle(request.title().trim());
        issue.setDescription(trimToNull(request.description()));
        issue.setSeverity(request.severity());
        issue.setStatus(request.status());
        issue.setResolutionNotes(trimToNull(request.resolutionNotes()));
        return IssueResponse.from(issueRepository.save(issue));
    }

    @Transactional
    public void delete(AuthenticatedUser caller, Long id) {
        Issue issue = loadOwnedIssue(caller, id);
        issueRepository.delete(issue);
    }

    /**
     * Loads an issue that the caller is permitted to modify (owner only). Returns
     * 404 for both missing and non-owned issues to avoid existence disclosure.
     */
    private Issue loadOwnedIssue(AuthenticatedUser caller, Long id) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Issue not found"));
        if (!caller.id().equals(issue.getOwnerId())) {
            throw new ResourceNotFoundException("Issue not found");
        }
        return issue;
    }

    private boolean canRead(AuthenticatedUser caller, Issue issue) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return true;
        }
        if (caller.id().equals(issue.getOwnerId())) {
            return true;
        }
        if (role == Role.MANAGER) {
            User owner = userRepository.findById(issue.getOwnerId()).orElse(null);
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

    private Specification<Issue> buildSpecification(Set<Long> allowedOwnerIds, Long ownerFilter, IssueFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (ownerFilter != null) {
                predicates.add(cb.equal(root.get("ownerId"), ownerFilter));
            } else if (allowedOwnerIds != null) {
                predicates.add(root.get("ownerId").in(allowedOwnerIds));
            }

            if (filter.status() != null) {
                predicates.add(cb.equal(root.get("status"), filter.status()));
            }
            if (filter.severity() != null) {
                predicates.add(cb.equal(root.get("severity"), filter.severity()));
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
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("resolutionNotes")), like)
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
