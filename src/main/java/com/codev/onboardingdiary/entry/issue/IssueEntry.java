package com.codev.onboardingdiary.entry.issue;

import com.codev.onboardingdiary.entry.EntryBase;
import com.codev.onboardingdiary.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;

/** A blocker or problem the recruit ran into. */
@Entity
@Table(name = "issue_entries")
public class IssueEntry extends EntryBase {

  @Column(nullable = false, length = 120)
  private String title;

  @Column(length = 4000)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private IssueSeverity severity;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private IssueStatus status;

  @Column(name = "resolution_notes", length = 4000)
  private String resolutionNotes;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  protected IssueEntry() {}

  public IssueEntry(User owner) {
    super(owner);
  }

  /** Records when the issue was first finished and clears it on reopen. */
  public void changeStatus(IssueStatus newStatus, Instant now) {
    if (newStatus.isOpen()) {
      resolvedAt = null;
    } else if (resolvedAt == null) {
      resolvedAt = now;
    }
    status = newStatus;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public IssueSeverity getSeverity() {
    return severity;
  }

  public void setSeverity(IssueSeverity severity) {
    this.severity = severity;
  }

  public IssueStatus getStatus() {
    return status;
  }

  public String getResolutionNotes() {
    return resolutionNotes;
  }

  public void setResolutionNotes(String resolutionNotes) {
    this.resolutionNotes = resolutionNotes;
  }

  public Instant getResolvedAt() {
    return resolvedAt;
  }
}
