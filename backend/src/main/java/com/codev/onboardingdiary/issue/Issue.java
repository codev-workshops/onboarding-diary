package com.codev.onboardingdiary.issue;

import com.codev.onboardingdiary.diary.DiaryEntry;
import com.codev.onboardingdiary.task.Task;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "issues")
public class Issue extends DiaryEntry {

  @Column(nullable = false, length = 150)
  private String title;

  @Column(length = 5000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private IssueSeverity severity;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private IssueStatus status;

  @Column(name = "resolution_notes", length = 5000)
  private String resolutionNotes;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "related_task_id")
  private Task relatedTask;

  protected Issue() {}

  public Issue(Long ownerId) {
    super(ownerId);
  }

  public void update(
      LocalDate entryDate,
      String title,
      String description,
      IssueSeverity severity,
      Task relatedTask) {
    setEntryDate(entryDate);
    this.title = title;
    this.description = description;
    this.severity = severity;
    this.relatedTask = relatedTask;
  }

  /**
   * Moves the issue to {@code newStatus}, replacing the resolution notes when given. Notes are
   * mandatory for RESOLVED/CLOSED; {@code resolvedAt} is set on the first transition into a
   * resolved state and cleared on reopen.
   */
  public void changeStatus(IssueStatus newStatus, String resolutionNotes, Instant now) {
    if (resolutionNotes != null) {
      this.resolutionNotes = resolutionNotes;
    }
    if (newStatus.isResolved() && this.resolutionNotes == null) {
      throw new MissingResolutionNotesException();
    }
    if (newStatus.isResolved() && (status == null || !status.isResolved())) {
      resolvedAt = now;
    } else if (!newStatus.isResolved()) {
      resolvedAt = null;
    }
    status = newStatus;
  }

  public void setResolutionNotes(String resolutionNotes) {
    this.resolutionNotes = resolutionNotes;
  }

  public String getTitle() {
    return title;
  }

  public String getDescription() {
    return description;
  }

  public IssueSeverity getSeverity() {
    return severity;
  }

  public IssueStatus getStatus() {
    return status;
  }

  public String getResolutionNotes() {
    return resolutionNotes;
  }

  public Instant getResolvedAt() {
    return resolvedAt;
  }

  public Task getRelatedTask() {
    return relatedTask;
  }

  /** Thrown when an issue would be resolved or closed without resolution notes. */
  public static class MissingResolutionNotesException extends RuntimeException {
    MissingResolutionNotesException() {
      super("Resolution notes are required to resolve or close an issue");
    }
  }
}
