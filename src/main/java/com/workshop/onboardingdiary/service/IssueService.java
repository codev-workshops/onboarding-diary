package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.IssueRequest;
import com.workshop.onboardingdiary.dto.IssueResponse;
import com.workshop.onboardingdiary.entity.IssueEntry;
import com.workshop.onboardingdiary.entity.IssueSeverity;
import com.workshop.onboardingdiary.entity.IssueStatus;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Issue Log CRUD, filters and ownership rules (REQUIREMENTS 4.3, US-R06, US-R07). */
@Service
public class IssueService {

    private final IssueEntryRepository issueEntryRepository;
    private final EntryAccessService access;

    public IssueService(IssueEntryRepository issueEntryRepository, EntryAccessService access) {
        this.issueEntryRepository = issueEntryRepository;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<IssueResponse> list(String callerEmail, Long userId, IssueStatus status, IssueSeverity severity,
                                    LocalDate dateFrom, LocalDate dateTo) {
        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        return issueEntryRepository.search(owner.getId(), dateFrom, dateTo, status, severity).stream()
                .map(IssueResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public IssueResponse get(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        IssueEntry issue = require(id);
        access.requireReadAccess(caller, issue.getOwner());
        return IssueResponse.from(issue);
    }

    @Transactional
    public IssueResponse create(String callerEmail, IssueRequest request) {
        User caller = access.requireUser(callerEmail);
        access.validateEntryDate(request.entryDate(), caller);
        requireResolutionNotes(request);

        IssueEntry issue = new IssueEntry();
        issue.setOwner(caller);
        apply(issue, request);
        return IssueResponse.from(issueEntryRepository.save(issue));
    }

    @Transactional
    public IssueResponse update(String callerEmail, Long id, IssueRequest request) {
        User caller = access.requireUser(callerEmail);
        IssueEntry issue = require(id);
        access.requireWriteAccess(caller, issue.getOwner());
        access.validateEntryDate(request.entryDate(), issue.getOwner());
        requireResolutionNotes(request);

        apply(issue, request);
        return IssueResponse.from(issueEntryRepository.save(issue));
    }

    @Transactional
    public void delete(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        IssueEntry issue = require(id);
        access.requireWriteAccess(caller, issue.getOwner());
        issueEntryRepository.delete(issue);
    }

    /** A resolved or closed issue must say how it was resolved (REQUIREMENTS 6.2). */
    private void requireResolutionNotes(IssueRequest request) {
        boolean settled = request.status() == IssueStatus.RESOLVED || request.status() == IssueStatus.CLOSED;
        if (settled && (request.resolutionNotes() == null || request.resolutionNotes().isBlank())) {
            throw new FieldValidationException("resolutionNotes",
                    "Resolution notes are required when the status is Resolved or Closed");
        }
    }

    private void apply(IssueEntry issue, IssueRequest request) {
        issue.setEntryDate(request.entryDate());
        issue.setTitle(request.title().trim());
        issue.setDescription(request.description());
        issue.setSeverity(request.severity());
        issue.setStatus(request.status());
        issue.setResolutionNotes(request.resolutionNotes());
    }

    private IssueEntry require(Long id) {
        return issueEntryRepository.findById(id)
                .orElseThrow(() -> new EntryNotFoundException("Issue " + id + " was not found"));
    }
}
