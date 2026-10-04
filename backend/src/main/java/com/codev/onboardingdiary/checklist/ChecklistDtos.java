package com.codev.onboardingdiary.checklist;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Request and response bodies of the checklist API. */
public final class ChecklistDtos {

  private ChecklistDtos() {}

  /** A template step; {@code dueDayOffset} is days after the recruit's start date. */
  public record TemplateItemDto(
      @NotBlank @Size(max = 200) String title,
      @Size(max = 1000) String description,
      @Min(0) @Max(365) Integer dueDayOffset) {}

  public record TemplateRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 1000) String description,
      @NotEmpty(message = "Add at least one item")
          @Size(max = 50, message = "A checklist can have at most 50 items")
          List<@Valid @NotNull TemplateItemDto> items,
      Integer version) {}

  public record TemplateResponse(
      Long id,
      String name,
      String description,
      List<TemplateItemDto> items,
      long assignedCount,
      Instant updatedAt,
      int version) {}

  public record AssignRequest(@NotEmpty @Size(max = 200) List<@NotNull Long> recruitIds) {}

  /** Recruits who got the checklist, and those skipped because they already had it. */
  public record AssignResult(List<Long> assigned, List<Long> skipped) {}

  public record ItemUpdateRequest(@NotNull Boolean completed) {}

  public record ItemResponse(
      Long id,
      String title,
      String description,
      LocalDate dueDate,
      Instant completedAt,
      boolean overdue) {}

  public record AssignmentResponse(
      Long id,
      Long templateId,
      String name,
      Instant assignedAt,
      int totalItems,
      int completedItems,
      double completionPct,
      List<ItemResponse> items) {}

  public record AssignmentSummary(
      Long id,
      Long recruitId,
      String recruitName,
      int totalItems,
      int completedItems,
      double completionPct) {}
}
