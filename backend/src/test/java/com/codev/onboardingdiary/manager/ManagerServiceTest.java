package com.codev.onboardingdiary.manager;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ManagerServiceTest {

  @Test
  void workingDaysAgoSkipsWeekends() {
    LocalDate wednesday = LocalDate.of(2026, 9, 30);
    assertThat(ManagerService.workingDaysAgo(wednesday, 5)).isEqualTo(LocalDate.of(2026, 9, 24));
    LocalDate sunday = LocalDate.of(2026, 10, 4);
    assertThat(ManagerService.workingDaysAgo(sunday, 5)).isEqualTo(LocalDate.of(2026, 9, 28));
    LocalDate friday = LocalDate.of(2026, 10, 2);
    assertThat(ManagerService.workingDaysAgo(friday, 1)).isEqualTo(friday);
  }
}
