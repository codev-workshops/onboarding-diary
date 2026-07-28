package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.FeedbackRequest;
import com.workshop.onboardingdiary.dto.FeedbackResponse;
import com.workshop.onboardingdiary.entity.FeedbackNote;
import com.workshop.onboardingdiary.entity.FeedbackType;
import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Feedback note CRUD, filters and ownership rules (REQUIREMENTS 4.4, US-R08). */
@Service
public class FeedbackService {

    private final FeedbackNoteRepository feedbackNoteRepository;
    private final EntryAccessService access;

    public FeedbackService(FeedbackNoteRepository feedbackNoteRepository, EntryAccessService access) {
        this.feedbackNoteRepository = feedbackNoteRepository;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> list(String callerEmail, Long userId, FeedbackType type,
                                      LocalDate dateFrom, LocalDate dateTo) {
        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        return feedbackNoteRepository.search(owner.getId(), dateFrom, dateTo, type).stream()
                .map(FeedbackResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public FeedbackResponse get(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        FeedbackNote feedback = require(id);
        access.requireReadAccess(caller, feedback.getOwner());
        return FeedbackResponse.from(feedback);
    }

    @Transactional
    public FeedbackResponse create(String callerEmail, FeedbackRequest request) {
        User caller = access.requireUser(callerEmail);
        requireRecruit(caller);
        access.validateEntryDate(request.entryDate(), caller);

        FeedbackNote feedback = new FeedbackNote();
        feedback.setOwner(caller);
        apply(feedback, request);
        return FeedbackResponse.from(feedbackNoteRepository.save(feedback));
    }

    @Transactional
    public FeedbackResponse update(String callerEmail, Long id, FeedbackRequest request) {
        User caller = access.requireUser(callerEmail);
        FeedbackNote feedback = require(id);
        access.requireWriteAccess(caller, feedback.getOwner());
        access.validateEntryDate(request.entryDate(), feedback.getOwner());

        apply(feedback, request);
        return FeedbackResponse.from(feedbackNoteRepository.save(feedback));
    }

    @Transactional
    public void delete(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        FeedbackNote feedback = require(id);
        access.requireWriteAccess(caller, feedback.getOwner());
        feedbackNoteRepository.delete(feedback);
    }

    /** Only New Recruits author feedback; Managers and Admins may read it (REQUIREMENTS 6.2). */
    private void requireRecruit(User caller) {
        if (caller.getRole() != Role.NEW_RECRUIT) {
            throw new AccessDeniedException("Only New Recruits may create feedback notes");
        }
    }

    private void apply(FeedbackNote feedback, FeedbackRequest request) {
        feedback.setEntryDate(request.entryDate());
        feedback.setSubject(request.subject().trim());
        feedback.setType(request.type());
        feedback.setDetails(request.details());
    }

    private FeedbackNote require(Long id) {
        return feedbackNoteRepository.findById(id)
                .orElseThrow(() -> new EntryNotFoundException("Feedback note " + id + " was not found"));
    }
}
