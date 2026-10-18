package com.codev.onboardingdiary.entry.issue;

/** Issue lifecycle; RESOLVED and CLOSED count as finished. */
public enum IssueStatus {
  OPEN,
  IN_PROGRESS,
  RESOLVED,
  CLOSED;

  public boolean isOpen() {
    return this == OPEN || this == IN_PROGRESS;
  }
}
