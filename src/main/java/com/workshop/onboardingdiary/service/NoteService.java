package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.NoteRequest;
import com.workshop.onboardingdiary.dto.NoteResponse;
import com.workshop.onboardingdiary.entity.AdditionalNote;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Additional note CRUD, tag normalisation and filters (REQUIREMENTS 4.5, US-R09). */
@Service
public class NoteService {

    private static final int MAX_TAGS = 10;
    private static final int MAX_TAG_LENGTH = 30;

    private final AdditionalNoteRepository additionalNoteRepository;
    private final EntryAccessService access;

    public NoteService(AdditionalNoteRepository additionalNoteRepository, EntryAccessService access) {
        this.additionalNoteRepository = additionalNoteRepository;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<NoteResponse> list(String callerEmail, Long userId, String tag,
                                   LocalDate dateFrom, LocalDate dateTo) {
        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        return additionalNoteRepository.search(owner.getId(), dateFrom, dateTo, normalizeTagFilter(tag)).stream()
                .map(NoteResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoteResponse get(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        AdditionalNote note = require(id);
        access.requireReadAccess(caller, note.getOwner());
        return NoteResponse.from(note);
    }

    @Transactional
    public NoteResponse create(String callerEmail, NoteRequest request) {
        User caller = access.requireUser(callerEmail);
        access.validateEntryDate(request.entryDate(), caller);

        AdditionalNote note = new AdditionalNote();
        note.setOwner(caller);
        apply(note, request);
        return NoteResponse.from(additionalNoteRepository.save(note));
    }

    @Transactional
    public NoteResponse update(String callerEmail, Long id, NoteRequest request) {
        User caller = access.requireUser(callerEmail);
        AdditionalNote note = require(id);
        access.requireWriteAccess(caller, note.getOwner());
        access.validateEntryDate(request.entryDate(), note.getOwner());

        apply(note, request);
        return NoteResponse.from(additionalNoteRepository.save(note));
    }

    @Transactional
    public void delete(String callerEmail, Long id) {
        User caller = access.requireUser(callerEmail);
        AdditionalNote note = require(id);
        access.requireWriteAccess(caller, note.getOwner());
        additionalNoteRepository.delete(note);
    }

    private void apply(AdditionalNote note, NoteRequest request) {
        note.setEntryDate(request.entryDate());
        note.setTitle(request.title().trim());
        note.setContent(request.content());
        note.setTags(normalizeTags(request.tags()));
    }

    /** Tags are trimmed, lower-cased and de-duplicated before saving (REQUIREMENTS 6.1). */
    private Set<String> normalizeTags(List<String> tags) {
        Set<String> normalized = new LinkedHashSet<>();
        if (tags == null) {
            return normalized;
        }
        for (String tag : tags) {
            if (tag == null) {
                throw new FieldValidationException("tags", tagLengthMessage());
            }
            String value = tag.trim().toLowerCase();
            if (value.isEmpty() || value.length() > MAX_TAG_LENGTH) {
                throw new FieldValidationException("tags", tagLengthMessage());
            }
            normalized.add(value);
        }
        if (normalized.size() > MAX_TAGS) {
            throw new FieldValidationException("tags", "At most " + MAX_TAGS + " tags are allowed");
        }
        return normalized;
    }

    /** The tag filter is normalised the same way so a search matches the stored tags. */
    private String normalizeTagFilter(String tag) {
        if (tag == null) {
            return null;
        }
        String value = tag.trim().toLowerCase();
        return value.isEmpty() ? null : value;
    }

    private String tagLengthMessage() {
        return "Each tag must be between 1 and " + MAX_TAG_LENGTH + " characters";
    }

    private AdditionalNote require(Long id) {
        return additionalNoteRepository.findById(id)
                .orElseThrow(() -> new EntryNotFoundException("Note " + id + " was not found"));
    }
}
