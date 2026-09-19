package com.codev.onboardingdiary.service;

import com.codev.onboardingdiary.domain.Note;
import com.codev.onboardingdiary.domain.User;
import com.codev.onboardingdiary.repository.NoteRepository;
import com.codev.onboardingdiary.repository.UserRepository;
import com.codev.onboardingdiary.security.AppUserDetails;
import com.codev.onboardingdiary.web.dto.NoteFilter;
import com.codev.onboardingdiary.web.dto.NoteForm;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NoteService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"));

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    public NoteService(NoteRepository noteRepository,
                       UserRepository userRepository,
                       AuthorizationService authorizationService) {
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    public List<Note> list(AppUserDetails principal, Long ownerId, NoteFilter filter) {
        authorizationService.requireReadAccess(principal, ownerId);
        return noteRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public List<Note> listForOwner(Long ownerId, NoteFilter filter) {
        return noteRepository.findAll(specification(ownerId, filter), NEWEST_FIRST);
    }

    public Note getForRead(AppUserDetails principal, Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Note not found"));
        authorizationService.requireReadAccess(principal, note.getUser());
        return note;
    }

    public Note getOwned(AppUserDetails principal, Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Note not found"));
        authorizationService.requireOwnRecord(principal, note.getUser().getId());
        return note;
    }

    @Transactional
    public Note create(AppUserDetails principal, NoteForm form) {
        User owner = userRepository.findById(principal.getId())
                .orElseThrow(() -> new NotFoundException("User not found"));
        Note note = new Note();
        note.setUser(owner);
        apply(note, form);
        return noteRepository.save(note);
    }

    @Transactional
    public Note update(AppUserDetails principal, Long id, NoteForm form) {
        Note note = getOwned(principal, id);
        apply(note, form);
        return noteRepository.save(note);
    }

    @Transactional
    public void delete(AppUserDetails principal, Long id) {
        noteRepository.delete(getOwned(principal, id));
    }

    public long countAll(Long ownerId) {
        return noteRepository.countByUserId(ownerId);
    }

    public List<Note> searchText(Long ownerId, String query) {
        return noteRepository.searchText(ownerId, query);
    }

    private void apply(Note note, NoteForm form) {
        note.setDate(form.getDate());
        note.setTitle(form.getTitle().trim());
        note.setContent(form.getContent());
        note.setTags(form.getTags());
    }

    static Specification<Note> specification(Long ownerId, NoteFilter filter) {
        NoteFilter effective = filter == null ? NoteFilter.empty() : filter;
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), ownerId));
            if (effective.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), effective.from()));
            }
            if (effective.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), effective.to()));
            }
            if (effective.q() != null && !effective.q().isBlank()) {
                String like = "%" + effective.q().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("tags"), "")), like),
                        cb.like(cb.lower(root.get("content")), like)));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
    }
}
