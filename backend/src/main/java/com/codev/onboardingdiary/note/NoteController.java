package com.codev.onboardingdiary.note;

import com.codev.onboardingdiary.auth.AuthenticatedUser;
import com.codev.onboardingdiary.diary.PageResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notes")
public class NoteController {

  private final NoteService service;

  public NoteController(NoteService service) {
    this.service = service;
  }

  @GetMapping
  public PageResponse<NoteResponse> list(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
      @RequestParam(required = false) List<String> tag,
      @RequestParam(required = false) String q,
      @PageableDefault(size = 20, sort = "entryDate", direction = Sort.Direction.DESC)
          Pageable pageable) {
    return service.list(principal.id(), from, to, tag, q, pageable);
  }

  @GetMapping("/tags")
  public List<String> tags(@AuthenticationPrincipal AuthenticatedUser principal) {
    return service.tags(principal.id());
  }

  @GetMapping("/{id}")
  public NoteResponse get(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    return service.get(principal.id(), id);
  }

  @PostMapping
  public ResponseEntity<NoteResponse> create(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @Valid @RequestBody NoteRequest request) {
    NoteResponse created = service.create(principal.id(), request);
    return ResponseEntity.created(URI.create("/api/notes/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  public NoteResponse update(
      @AuthenticationPrincipal AuthenticatedUser principal,
      @PathVariable Long id,
      @Valid @RequestBody NoteRequest request) {
    return service.update(principal.id(), id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(
      @AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
    service.delete(principal.id(), id);
    return ResponseEntity.noContent().build();
  }
}
