package com.workshop.onboardingdiary.reports;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.workshop.onboardingdiary.entity.Role;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.service.JwtService;
import com.workshop.onboardingdiary.support.TestUsers;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Report parameter validation (REQUIREMENTS 4.7, 6.1): the date range is required, well formed,
 * ordered and not in the future, and downloads need a known format.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReportValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private TestUsers testUsers;

    private String token;

    @BeforeEach
    void setUp() {
        User recruit = testUsers.create("report-validation@example.com", "sup3rsecret", Role.NEW_RECRUIT, true,
                LocalDate.of(2026, 1, 5));
        token = jwtService.issueToken(recruit.getEmail(), recruit.getRole());
    }

    @Test
    void aMissingDateFromIsRejected() throws Exception {
        mockMvc.perform(report("?dateTo=2026-02-28&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateFrom").value("Date is required"));
    }

    @Test
    void aMissingDateToIsRejected() throws Exception {
        mockMvc.perform(report("?dateFrom=2026-02-01&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateTo").value("Date is required"));
    }

    @Test
    void aBadlyFormattedDateIsRejected() throws Exception {
        mockMvc.perform(report("?dateFrom=01-02-2026&dateTo=2026-02-28&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateFrom").value("Date must be in yyyy-MM-dd format"));
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=not-a-date&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateTo").value("Date must be in yyyy-MM-dd format"));
        mockMvc.perform(report("?dateFrom=2026-02-30&dateTo=2026-02-28&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateFrom").value("Date must be in yyyy-MM-dd format"));
    }

    @Test
    void aReversedRangeIsRejected() throws Exception {
        mockMvc.perform(report("?dateFrom=2026-03-01&dateTo=2026-02-01&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateFrom").value("dateFrom may not be after dateTo"));
    }

    @Test
    void aRangeReachingIntoTheFutureIsRejected() throws Exception {
        String tomorrow = LocalDate.now().plusDays(1).toString();
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=" + tomorrow + "&format=csv"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateTo").value("Report range may not be after today"));
    }

    @Test
    void aRangeEndingTodayIsAccepted() throws Exception {
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=" + LocalDate.now() + "&format=csv"))
                .andExpect(status().isOk());
    }

    @Test
    void aMissingFormatIsRejectedForDownloads() throws Exception {
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=2026-02-28"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.format").value("Format is required"));
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=2026-02-28&format="))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.format").value("Format is required"));
    }

    @Test
    void anUnknownFormatIsRejected() throws Exception {
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=2026-02-28&format=xlsx"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.format").value("Format must be one of pdf, csv"));
    }

    @Test
    void theFormatIsCaseInsensitive() throws Exception {
        mockMvc.perform(report("?dateFrom=2026-02-01&dateTo=2026-02-28&format=PDF"))
                .andExpect(status().isOk());
    }

    @Test
    void thePreviewValidatesTheSameDateRules() throws Exception {
        mockMvc.perform(get("/api/reports/preview?dateTo=2026-02-28").header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateFrom").value("Date is required"));
        mockMvc.perform(get("/api/reports/preview?dateFrom=2026-03-01&dateTo=2026-02-01")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateFrom").value("dateFrom may not be after dateTo"));
    }

    @Test
    void thePreviewNeedsNoFormat() throws Exception {
        mockMvc.perform(get("/api/reports/preview?dateFrom=2026-02-01&dateTo=2026-02-28")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEntries").value(0));
    }

    private RequestBuilder report(String query) {
        return get("/api/reports" + query).header("Authorization", "Bearer " + token);
    }
}
