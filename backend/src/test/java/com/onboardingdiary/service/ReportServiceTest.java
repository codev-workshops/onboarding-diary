package com.onboardingdiary.service;

import com.onboardingdiary.dto.request.ReportRequest;
import com.onboardingdiary.dto.response.ReportResponse;
import com.onboardingdiary.entity.Report;
import com.onboardingdiary.entity.User;
import com.onboardingdiary.enums.ReportFormat;
import com.onboardingdiary.enums.ReportType;
import com.onboardingdiary.enums.Role;
import com.onboardingdiary.exception.BadRequestException;
import com.onboardingdiary.exception.ResourceNotFoundException;
import com.onboardingdiary.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private IssueRepository issueRepository;

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ReportService reportService;

    private User manager;
    private User recruit;
    private User unassignedRecruit;

    @BeforeEach
    void setUp() {
        manager = User.builder()
                .id(UUID.randomUUID())
                .email("manager@test.com")
                .fullName("Manager")
                .role(Role.MANAGER)
                .build();

        recruit = User.builder()
                .id(UUID.randomUUID())
                .email("recruit@test.com")
                .fullName("Recruit")
                .role(Role.RECRUIT)
                .manager(manager)
                .build();

        unassignedRecruit = User.builder()
                .id(UUID.randomUUID())
                .email("unassigned@test.com")
                .fullName("Unassigned")
                .role(Role.RECRUIT)
                .build();
    }

    @Test
    void generate_recruitOwnReport_succeeds() {
        ReportRequest request = new ReportRequest();
        request.setDateFrom(LocalDate.now().minusDays(30));
        request.setDateTo(LocalDate.now());
        request.setReportType(ReportType.TASKS);
        request.setFormat(ReportFormat.CSV);

        when(userRepository.findById(recruit.getId())).thenReturn(Optional.of(recruit));
        when(taskRepository.findByUserWithFilters(eq(recruit.getId()), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        ReportResponse response = reportService.generate(recruit.getId(), "RECRUIT", request);

        assertNotNull(response);
        verify(reportRepository).save(any(Report.class));
    }

    @Test
    void generate_managerForAssignedRecruit_succeeds() {
        ReportRequest request = new ReportRequest();
        request.setUserId(recruit.getId());
        request.setDateFrom(LocalDate.now().minusDays(30));
        request.setDateTo(LocalDate.now());
        request.setReportType(ReportType.TASKS);
        request.setFormat(ReportFormat.CSV);

        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(userRepository.findById(recruit.getId())).thenReturn(Optional.of(recruit));
        when(taskRepository.findByUserWithFilters(eq(recruit.getId()), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));
        when(reportRepository.save(any(Report.class))).thenAnswer(inv -> {
            Report r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        ReportResponse response = reportService.generate(manager.getId(), "MANAGER", request);

        assertNotNull(response);
    }

    @Test
    void generate_managerForUnassignedRecruit_throwsBadRequest() {
        ReportRequest request = new ReportRequest();
        request.setUserId(unassignedRecruit.getId());
        request.setDateFrom(LocalDate.now().minusDays(30));
        request.setDateTo(LocalDate.now());
        request.setReportType(ReportType.TASKS);
        request.setFormat(ReportFormat.CSV);

        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(userRepository.findById(unassignedRecruit.getId())).thenReturn(Optional.of(unassignedRecruit));

        assertThrows(BadRequestException.class, () ->
                reportService.generate(manager.getId(), "MANAGER", request));
    }

    @Test
    void generate_recruitForOtherUser_throwsBadRequest() {
        ReportRequest request = new ReportRequest();
        request.setUserId(unassignedRecruit.getId());
        request.setDateFrom(LocalDate.now().minusDays(30));
        request.setDateTo(LocalDate.now());
        request.setReportType(ReportType.TASKS);
        request.setFormat(ReportFormat.CSV);

        assertThrows(BadRequestException.class, () ->
                reportService.generate(recruit.getId(), "RECRUIT", request));
    }

    @Test
    void download_ownerCanDownload() throws Exception {
        Report report = Report.builder()
                .id(UUID.randomUUID())
                .generatedBy(manager)
                .filePath("/nonexistent/path")
                .build();

        when(reportRepository.findById(report.getId())).thenReturn(Optional.of(report));

        assertThrows(ResourceNotFoundException.class, () ->
                reportService.download(report.getId(), manager.getId()));
    }

    @Test
    void download_nonOwner_throwsBadRequest() {
        Report report = Report.builder()
                .id(UUID.randomUUID())
                .generatedBy(manager)
                .build();

        when(reportRepository.findById(report.getId())).thenReturn(Optional.of(report));

        assertThrows(BadRequestException.class, () ->
                reportService.download(report.getId(), recruit.getId()));
    }

    @Test
    void list_returnsPagedReports() {
        Report report = Report.builder()
                .id(UUID.randomUUID())
                .generatedBy(manager)
                .dateFrom(LocalDate.now().minusDays(30))
                .dateTo(LocalDate.now())
                .reportType(ReportType.COMBINED)
                .format(ReportFormat.CSV)
                .filePath("/tmp/report.csv")
                .build();

        when(reportRepository.findByGeneratedByIdOrderByCreatedAtDesc(eq(manager.getId()), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(report)));

        var result = reportService.list(manager.getId(), PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
    }
}
