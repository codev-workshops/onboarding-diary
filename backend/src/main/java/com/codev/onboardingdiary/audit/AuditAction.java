package com.codev.onboardingdiary.audit;

/** Recorded administrative and reporting actions. */
public enum AuditAction {
  USER_CREATED,
  PROFILE_UPDATED,
  ROLES_CHANGED,
  MANAGER_ASSIGNED,
  USER_ENABLED,
  USER_DISABLED,
  PASSWORD_RESET,
  REPORT_GENERATED
}
