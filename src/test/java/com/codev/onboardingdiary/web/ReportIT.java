package com.codev.onboardingdiary.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

import com.codev.onboardingdiary.service.ReportData;
import com.codev.onboardingdiary.service.ReportService;
import com.codev.onboardingdiary.service.ReportType;
import com.codev.onboardingdiary.support.IntegrationTest;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;

class ReportIT extends IntegrationTest {

    @Autowired private ReportService reportService;

    @Test
    void csvDownloadContainsOnlyEntriesInsideTheDateRange() throws Exception {
        String csv = mockMvc.perform(get("/reports/download/csv").with(as(recruit))
                        .param("type", "COMBINED")
                        .param("from", LocalDate.now().minusDays(3).toString())
                        .param("to", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("attachment")))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(csv).contains("Set up VPN access", "VPN certificate rejected", "Buddy system is great");
        assertThat(csv).doesNotContain("Meet the team");
    }

    @Test
    void typeFilterLimitsSections() throws Exception {
        String csv = mockMvc.perform(get("/reports/download/csv").with(as(recruit))
                        .param("type", "TASKS")
                        .param("from", LocalDate.now().minusMonths(1).toString())
                        .param("to", LocalDate.now().toString()))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(csv).contains("Set up VPN access");
        assertThat(csv).doesNotContain("VPN certificate rejected");
    }

    @Test
    void pdfDownloadIsAValidPdf() throws Exception {
        byte[] pdf = mockMvc.perform(get("/reports/download/pdf").with(as(recruit))
                        .param("type", "COMBINED")
                        .param("from", LocalDate.now().minusMonths(1).toString())
                        .param("to", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(new String(pdf, 0, 5, StandardCharsets.ISO_8859_1)).isEqualTo("%PDF-");
        assertThat(pdf.length).isGreaterThan(500);
    }

    @Test
    void managerCanReportOnOwnTeamOnly() {
        ReportData data = reportService.build(principal(manager), recruit.getId(),
                LocalDate.now().minusMonths(1), LocalDate.now(), ReportType.COMBINED);
        assertThat(data.userEmail()).isEqualTo(recruit.getEmail());

        assertThatThrownBy(() -> reportService.build(principal(manager), otherRecruit.getId(),
                LocalDate.now().minusMonths(1), LocalDate.now(), ReportType.TASKS))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void adminCanReportOnAnyoneAndRecruitOnlyOnThemselves() {
        assertThat(reportService.build(principal(admin), otherRecruit.getId(),
                LocalDate.now().minusMonths(1), LocalDate.now(), ReportType.TASKS).tasks()).hasSize(1);

        assertThatThrownBy(() -> reportService.build(principal(recruit), otherRecruit.getId(),
                LocalDate.now().minusMonths(1), LocalDate.now(), ReportType.TASKS))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void invalidRangeIsRejected() {
        assertThatThrownBy(() -> reportService.build(principal(recruit), recruit.getId(),
                LocalDate.now(), LocalDate.now().minusDays(5), ReportType.TASKS))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> reportService.build(principal(recruit), recruit.getId(),
                null, LocalDate.now(), ReportType.TASKS))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void invalidRangeRedisplaysTheReportFormWithAnExplanation() throws Exception {
        mockMvc.perform(get("/reports/download/csv").with(as(recruit))
                        .param("from", LocalDate.now().toString())
                        .param("to", LocalDate.now().minusDays(5).toString())
                        .param("type", "COMBINED"))
                .andExpect(status().isBadRequest())
                .andExpect(view().name("reports"))
                .andExpect(model().attribute("errorMessage", "Start date must be before end date"));
    }

    @Test
    void recruitCannotDownloadSomeoneElsesReport() throws Exception {
        mockMvc.perform(get("/reports/download/csv").with(as(recruit))
                        .param("type", "TASKS")
                        .param("userId", otherRecruit.getId().toString())
                        .param("from", LocalDate.now().minusMonths(1).toString())
                        .param("to", LocalDate.now().toString()))
                .andExpect(status().isForbidden());
    }
}
