package com.codev.onboardingdiary.diary;

import com.codev.onboardingdiary.common.ApiException;
import com.codev.onboardingdiary.common.AuditableEntity;

/** Compares the version a client last saw with the stored one before applying an update. */
public final class OptimisticLock {

  private OptimisticLock() {}

  public static void check(Integer expectedVersion, AuditableEntity entity) {
    if (expectedVersion != null && expectedVersion != entity.getVersion()) {
      throw ApiException.conflict("This entry was changed elsewhere. Reload it and try again.");
    }
  }
}
