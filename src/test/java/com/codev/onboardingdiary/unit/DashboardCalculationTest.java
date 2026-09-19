package com.codev.onboardingdiary.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.codev.onboardingdiary.service.DashboardService;
import org.junit.jupiter.api.Test;

class DashboardCalculationTest {

    @Test
    void zeroTasksMeansZeroPercent() {
        assertThat(DashboardService.completionPercentage(0, 0)).isZero();
    }

    @Test
    void roundsToNearestPercent() {
        assertThat(DashboardService.completionPercentage(3, 1)).isEqualTo(33);
        assertThat(DashboardService.completionPercentage(3, 2)).isEqualTo(67);
        assertThat(DashboardService.completionPercentage(8, 2)).isEqualTo(25);
        assertThat(DashboardService.completionPercentage(4, 4)).isEqualTo(100);
    }
}
