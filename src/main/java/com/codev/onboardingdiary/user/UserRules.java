package com.codev.onboardingdiary.user;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.DateRules;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/** Validation rules for user fields that depend on role or the current date. */
@Component
public class UserRules {

  private final DateRules dateRules;

  public UserRules(DateRules dateRules) {
    this.dateRules = dateRules;
  }

  public void validateStartDate(Role role, LocalDate startDate) {
    if (startDate == null) {
      if (role == Role.RECRUIT) {
        throw ApiException.fieldError("startDate", "is required for recruits");
      }
      return;
    }
    LocalDate today = dateRules.today();
    if (startDate.isBefore(today.minusYears(1))) {
      throw ApiException.fieldError("startDate", "must not be more than 1 year in the past");
    }
    if (startDate.isAfter(today.plusMonths(6))) {
      throw ApiException.fieldError("startDate", "must not be more than 6 months in the future");
    }
  }
}
