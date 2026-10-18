package com.codev.onboardingdiary.common;

import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/** Shared date validation rules. */
@Component
public class DateRules {

  /** Browsers may be a calendar day ahead of the server, so "today" tolerates one day. */
  private static final int TIMEZONE_TOLERANCE_DAYS = 1;

  private final Clock clock;

  public DateRules(Clock clock) {
    this.clock = clock;
  }

  public LocalDate today() {
    return LocalDate.now(clock);
  }

  public void requireNotFuture(LocalDate date, String field) {
    if (date != null && date.isAfter(today().plusDays(TIMEZONE_TOLERANCE_DAYS))) {
      throw ApiException.fieldError(field, "must not be in the future");
    }
  }

  public void requireNotAfter(LocalDate date, LocalDate latest, String field, String message) {
    if (date != null && date.isAfter(latest)) {
      throw ApiException.fieldError(field, message);
    }
  }

  /** Validates an optional inclusive range used by list filters. */
  public static void requireValidRange(LocalDate from, LocalDate to) {
    if (from != null && to != null && from.isAfter(to)) {
      throw ApiException.fieldError("from", "must be on or before 'to'");
    }
  }
}
