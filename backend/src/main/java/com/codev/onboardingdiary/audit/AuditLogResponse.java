package com.codev.onboardingdiary.audit;

import java.time.Instant;

/** Audit log entry with actor and target resolved to names and emails. */
public record AuditLogResponse(
    Long id, Instant createdAt, AuditAction action, UserRef actor, UserRef target, String details) {

  /** Display reference to a user; null when the entry has no such user. */
  public record UserRef(Long id, String fullName, String email) {}
}
