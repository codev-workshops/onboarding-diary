package com.codev.onboardingdiary.entry.feedback;

import com.codev.onboardingdiary.common.PageResponse;
import com.codev.onboardingdiary.common.Paging;
import com.codev.onboardingdiary.entry.EntrySpecs;
import com.codev.onboardingdiary.user.CurrentUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.LocalDate;
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

/** The logged-in recruit's own feedback. */
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

  private final FeedbackService service;
  private final CurrentUser currentUser;

  public FeedbackController(FeedbackService service, CurrentUser currentUser) {
    this.service = service;
    this.currentUser = currentUser;
  }

  @GetMapping
  PageResponse<FeedbackDto> list(
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(required = false) FeedbackType type,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size) {
    return service.list(
        currentUser.get(),
        new FeedbackFilter(from, to, type),
        Paging.of(page, size, EntrySpecs.NEWEST_FIRST));
  }

  @GetMapping("/{id}")
  FeedbackDto get(@PathVariable Long id) {
    return service.get(currentUser.get(), id);
  }

  @PostMapping
  ResponseEntity<FeedbackDto> create(@Valid @RequestBody FeedbackRequest request) {
    FeedbackDto created = service.create(currentUser.get(), request);
    return ResponseEntity.created(URI.create("/api/feedback/" + created.id())).body(created);
  }

  @PutMapping("/{id}")
  FeedbackDto update(@PathVariable Long id, @Valid @RequestBody FeedbackRequest request) {
    return service.update(currentUser.get(), id, request);
  }

  @DeleteMapping("/{id}")
  ResponseEntity<Void> delete(@PathVariable Long id) {
    service.delete(currentUser.get(), id);
    return ResponseEntity.noContent().build();
  }
}
