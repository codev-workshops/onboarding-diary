package com.workshop.onboardingdiary.service;

import com.workshop.onboardingdiary.dto.FeedbackResponse;
import com.workshop.onboardingdiary.dto.IssueResponse;
import com.workshop.onboardingdiary.dto.NoteResponse;
import com.workshop.onboardingdiary.dto.ReportFile;
import com.workshop.onboardingdiary.dto.ReportResponse;
import com.workshop.onboardingdiary.dto.TaskResponse;
import com.workshop.onboardingdiary.entity.User;
import com.workshop.onboardingdiary.repository.AdditionalNoteRepository;
import com.workshop.onboardingdiary.repository.FeedbackNoteRepository;
import com.workshop.onboardingdiary.repository.IssueEntryRepository;
import com.workshop.onboardingdiary.repository.TaskEntryRepository;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Date-range reports for one recruit (REQUIREMENTS 4.7, US-R11, US-M04, decision D6): the tasks,
 * issues, feedback and notes whose entry date falls inside the inclusive range, rendered as JSON,
 * CSV or PDF. Authorization is the shared {@link EntryAccessService} rule used by the entry lists
 * and the dashboard.
 */
@Service
public class ReportService {

    private final TaskEntryRepository taskEntryRepository;
    private final IssueEntryRepository issueEntryRepository;
    private final FeedbackNoteRepository feedbackNoteRepository;
    private final AdditionalNoteRepository additionalNoteRepository;
    private final EntryAccessService access;
    private final CsvReportRenderer csvRenderer;
    private final PdfReportRenderer pdfRenderer;

    public ReportService(TaskEntryRepository taskEntryRepository,
                         IssueEntryRepository issueEntryRepository,
                         FeedbackNoteRepository feedbackNoteRepository,
                         AdditionalNoteRepository additionalNoteRepository,
                         EntryAccessService access,
                         CsvReportRenderer csvRenderer,
                         PdfReportRenderer pdfRenderer) {
        this.taskEntryRepository = taskEntryRepository;
        this.issueEntryRepository = issueEntryRepository;
        this.feedbackNoteRepository = feedbackNoteRepository;
        this.additionalNoteRepository = additionalNoteRepository;
        this.access = access;
        this.csvRenderer = csvRenderer;
        this.pdfRenderer = pdfRenderer;
    }

    @Transactional(readOnly = true)
    public ReportResponse preview(String callerEmail, Long userId, String dateFrom, String dateTo) {
        return assemble(callerEmail, userId, dateFrom, dateTo);
    }

    @Transactional(readOnly = true)
    public ReportFile download(String callerEmail, Long userId, String dateFrom, String dateTo, String format) {
        ReportFormat reportFormat = ReportFormat.parse(format);
        ReportResponse report = assemble(callerEmail, userId, dateFrom, dateTo);
        byte[] content = reportFormat == ReportFormat.PDF ? pdfRenderer.render(report) : csvRenderer.render(report);
        return new ReportFile(ReportRendering.filename(report, reportFormat), reportFormat.contentType(), content);
    }

    private ReportResponse assemble(String callerEmail, Long userId, String rawDateFrom, String rawDateTo) {
        LocalDate dateFrom = requireDate(rawDateFrom, "dateFrom");
        LocalDate dateTo = requireDate(rawDateTo, "dateTo");
        if (dateFrom.isAfter(dateTo)) {
            throw new FieldValidationException("dateFrom", "dateFrom may not be after dateTo");
        }
        if (dateTo.isAfter(LocalDate.now())) {
            throw new FieldValidationException("dateTo", "Report range may not be after today");
        }

        User caller = access.requireUser(callerEmail);
        User owner = access.resolveListTarget(caller, userId);
        Long ownerId = owner.getId();

        return ReportResponse.of(ownerId, owner.getName(), dateFrom, dateTo,
                taskEntryRepository.search(ownerId, dateFrom, dateTo, null, null).stream()
                        .map(TaskResponse::from).toList(),
                issueEntryRepository.search(ownerId, dateFrom, dateTo, null, null).stream()
                        .map(IssueResponse::from).toList(),
                feedbackNoteRepository.search(ownerId, dateFrom, dateTo, null).stream()
                        .map(FeedbackResponse::from).toList(),
                additionalNoteRepository.search(ownerId, dateFrom, dateTo, null).stream()
                        .map(NoteResponse::from).toList());
    }

    private LocalDate requireDate(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new FieldValidationException(field, "Date is required");
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new FieldValidationException(field, "Date must be in yyyy-MM-dd format");
        }
    }
}
