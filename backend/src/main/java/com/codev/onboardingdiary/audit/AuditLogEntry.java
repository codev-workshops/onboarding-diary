package com.codev.onboardingdiary.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Immutable record of who did what to whom, and when. */
@Entity
@Table(name = "audit_log")
public class AuditLogEntry {

  static final int MAX_DETAILS_LENGTH = 4000;

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "actor_id")
  private Long actorId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 50)
  private AuditAction action;

  @Column(name = "target_user_id")
  private Long targetUserId;

  @Column(length = MAX_DETAILS_LENGTH)
  private String details;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected AuditLogEntry() {}

  public AuditLogEntry(
      Long actorId, AuditAction action, Long targetUserId, String details, Instant createdAt) {
    this.actorId = actorId;
    this.action = action;
    this.targetUserId = targetUserId;
    this.details = details;
    this.createdAt = createdAt;
  }

  public Long getId() {
    return id;
  }

  public Long getActorId() {
    return actorId;
  }

  public AuditAction getAction() {
    return action;
  }

  public Long getTargetUserId() {
    return targetUserId;
  }

  public String getDetails() {
    return details;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
