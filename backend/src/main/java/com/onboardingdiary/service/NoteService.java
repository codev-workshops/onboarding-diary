package com.onboardingdiary.service;

import com.onboardingdiary.dto.CreateNoteRequest;
import com.onboardingdiary.dto.NoteFilter;
import com.onboardingdiary.dto.NoteResponse;
import com.onboardingdiary.dto.UpdateNoteRequest;
import com.onboardingdiary.entity.Note;
import com.onboardingdiary.entity.Role;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.NoteRepository;
import com.onboardingdiary.repository.UserRepository;
import com.onboardingdiary.security.AuthenticatedUser;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public NoteService(NoteRepository noteRepository, UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public NoteResponse create(AuthenticatedUser caller, CreateNoteRequest request) {
        Note note = new Note();
        note.setOwnerId(caller.id());
        note.setDate(request.date());
        note.setTitle(request.title().trim());
        note.setContent(trimToNull(request.content()));
        note.setTags(normalizeTags(request.tags()));
        return NoteResponse.from(noteRepository.save(note));
    }

    @Transactional(readOnly = true)
    public Page<NoteResponse> list(AuthenticatedUser caller, NoteFilter filter, Pageable pageable) {
        Set<Long> allowedOwnerIds = visibleOwnerIds(caller);
        Long ownerFilter = filter.ownerId();

        if (ownerFilter != null && allowedOwnerIds != null && !allowedOwnerIds.contains(ownerFilter)) {
            throw new AccessDeniedException("Not allowed to view this user's notes");
        }

        Specification<Note> spec = buildSpecification(allowedOwnerIds, ownerFilter, filter);
        return noteRepository.findAll(spec, pageable).map(NoteResponse::from);
    }

    @Transactional(readOnly = true)
    public NoteResponse get(AuthenticatedUser caller, Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        if (!canRead(caller, note)) {
            // 404 rather than 403 to avoid disclosing existence of others' notes.
            throw new ResourceNotFoundException("Note not found");
        }
        return NoteResponse.from(note);
    }

    @Transactional
    public NoteResponse update(AuthenticatedUser caller, Long id, UpdateNoteRequest request) {
        Note note = loadOwnedNote(caller, id);
        note.setDate(request.date());
        note.setTitle(request.title().trim());
        note.setContent(trimToNull(request.content()));
        note.setTags(normalizeTags(request.tags()));
        return NoteResponse.from(noteRepository.save(note));
    }

    @Transactional
    public void delete(AuthenticatedUser caller, Long id) {
        Note note = loadOwnedNote(caller, id);
        noteRepository.delete(note);
    }

    /**
     * Loads a note the caller may modify (owner only). Returns 404 for both
     * missing and non-owned notes to avoid existence disclosure.
     */
    private Note loadOwnedNote(AuthenticatedUser caller, Long id) {
        Note note = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
        if (!caller.id().equals(note.getOwnerId())) {
            throw new ResourceNotFoundException("Note not found");
        }
        return note;
    }

    private boolean canRead(AuthenticatedUser caller, Note note) {
        Role role = Role.valueOf(caller.role());
        if (role == Role.ADMIN) {
            return true;
        }
        if (caller.id().equals(note.getOwnerId())) {
            return true;
        }
        if (role == Role.MANAGER) {
            User owner = userRepository.findById(note.getOwnerId()).orElse(null);
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

    private Specification<Note> buildSpecification(Set<Long> allowedOwnerIds, Long ownerFilter, NoteFilter filter) {
        Set<String> tagFilter = normalizeTags(filter.tags());
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (ownerFilter != null) {
                predicates.add(cb.equal(root.get("ownerId"), ownerFilter));
            } else if (allowedOwnerIds != null) {
                predicates.add(root.get("ownerId").in(allowedOwnerIds));
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
                        cb.like(cb.lower(root.get("content")), like)
                ));
            }
            for (String tag : tagFilter) {
                Expression<Collection<String>> tags = root.get("tags");
                predicates.add(cb.isMember(tag, tags));
            }
            if (query != null) {
                query.distinct(true);
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** Normalizes tags: trims, lowercases, drops blanks, and de-duplicates. */
    private Set<String> normalizeTags(Collection<String> tags) {
        Set<String> normalized = new LinkedHashSet<>();
        if (tags == null) {
            return normalized;
        }
        for (String tag : tags) {
            if (tag == null) {
                continue;
            }
            String cleaned = tag.trim().toLowerCase();
            if (!cleaned.isEmpty()) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
