using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Reports.Dtos;

public record GenerateReportRequest(
    DateTime StartDate,
    DateTime EndDate,
    List<string> Categories,
    Guid? RecruitId,
    ReportFormat Format);
