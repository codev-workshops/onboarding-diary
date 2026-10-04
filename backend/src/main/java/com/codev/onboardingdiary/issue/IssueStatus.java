package com.codev.onboardingdiary.issue;

public enum IssueStatus {
  OPEN,
  IN_PROGRESS,
  RESOLVED,
  CLOSED;

  public boolean isResolved() {
    return this == RESOLVED || this == CLOSED;
  }
}
