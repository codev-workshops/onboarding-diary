package com.codev.onboardingdiary.checklist;

import com.codev.onboardingdiary.user.UserRef;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** Request and response bodies for the checklist extension. */
public final class ChecklistDtos {

  private ChecklistDtos() {}

  /** New template; items are kept in the given order. */
  public record TemplateRequest(
      @NotBlank @Size(max = 100) String name,
      @NotNull @Size(min = 1, max = 30) List<@NotBlank @Size(max = 200) String> items) {}

  /** Template as listed to managers and admins. */
  public record TemplateDto(Long id, String name, List<String> items, UserRef createdBy) {
    static TemplateDto of(ChecklistTemplate template) {
      return new TemplateDto(
          template.getId(),
          template.getName(),
          template.getItems(),
          UserRef.of(template.getCreatedBy()));
    }
  }

  /** Assign a template to a recruit. */
  public record AssignRequest(@NotNull Long templateId) {}

  /** Tick or untick an item. */
  public record ItemUpdateRequest(@NotNull Boolean done) {}

  /** One checklist step. */
  public record ItemDto(Long id, String label, boolean done, Instant doneAt) {}

  /** A recruit checklist with progress. */
  public record ChecklistDto(
      Long id,
      String name,
      UserRef assignedBy,
      Instant assignedAt,
      long done,
      int total,
      List<ItemDto> items) {
    static ChecklistDto of(RecruitChecklist checklist) {
      List<ItemDto> items =
          checklist.getItems().stream()
              .map(i -> new ItemDto(i.getId(), i.getLabel(), i.isDone(), i.getDoneAt()))
              .toList();
      return new ChecklistDto(
          checklist.getId(),
          checklist.getName(),
          UserRef.of(checklist.getAssignedBy()),
          checklist.getAssignedAt(),
          items.stream().filter(ItemDto::done).count(),
          items.size(),
          items);
    }
  }
}
