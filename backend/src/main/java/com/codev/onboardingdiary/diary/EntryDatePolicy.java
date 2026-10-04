package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.user.ProfileRepository;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/**
 * Entry dates may not be in the future and may not be more than {@value #DAYS_BEFORE_START} days
 * before the owner's start date. "Today" allows one day of slack for time zones ahead of UTC.
 */
@Component
public class EntryDatePolicy {

  static final int DAYS_BEFORE_START = 30;

  private final ProfileRepository profileRepository;
  private final Clock clock;

  public EntryDatePolicy(ProfileRepository profileRepository, Clock clock) {
    this.profileRepository = profileRepository;
    this.clock = clock;
  }

  public void validate(Long ownerId, LocalDate entryDate) {
    if (entryDate.isAfter(LocalDate.now(clock).plusDays(1))) {
      throw ApiException.invalidField("entryDate", "Date cannot be in the future");
    }
    LocalDate startDate =
        profileRepository
            .findById(ownerId)
            .orElseThrow(() -> ApiException.notFound("Profile not found"))
            .getStartDate();
    LocalDate earliest = startDate.minusDays(DAYS_BEFORE_START);
    if (entryDate.isBefore(earliest)) {
      throw ApiException.invalidField(
          "entryDate", "Date cannot be earlier than " + earliest + " (30 days before your start)");
    }
  }
}
