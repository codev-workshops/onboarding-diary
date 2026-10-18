package com.codev.onboardingdiary.entry.note;

import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Paging;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.user.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The logged-in recruit's own notes. */
@RestController
@RequestMapping("/api/notes")
public class NoteController {

  private final NoteService service;
  private final CurrentUser currentUser;

  public NoteController(NoteService service, CurrentUser currentUser) {
    this.service = service;
    this.currentUser = currentUser;
  }

  @GetMapping
  PageResponse<NoteDto> list(
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) String tag,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return service.list(
        currentUser.get(),
        new NoteFilter(from, to, tag),
        Paging.of(page, size, EntrySpecs.NEWEST_FIRST));
  }

  @GetMapping("/tags")
  List<String> tags() {
    return service.tags(currentUser.get());
  }

  @GetMapping("/{id}")
  NoteDto get(@PathVariable Long id) {
    return service.get(currentUser.get(), id);
  }

  @PostMapping
  ResponseEntity<NoteDto> create(@Valid @RequestBody NoteRequest request) {
    NoteDto created = service.create(currentUser.get(), request);
    return ResponseEntity.created(URI.create("/api/notes/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  NoteDto update(@PathVariable Long id, @Valid @RequestBody NoteRequest request) {
    return service.update(currentUser.get(), id, request);
  }

  @DeleteMapping("/{id}")
  ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(currentUser.get(), id);
    return ResponseEntity.noContent().build();
  }
}
