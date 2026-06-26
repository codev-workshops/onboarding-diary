using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Reports.Dtos;

public record ReportDto(
    Guid Id,
    Guid GeneratedBy,
    Guid RecruitId,
    string RecruitName,
    DateTime StartDate,
    DateTime EndDate,
    List<string> Categories,
    ReportFormat Format,
    string? FileUrl,
    DateTime CreatedAt);

public record ReportListItemDto(
    Guid Id,
    Guid GeneratedBy,
    Guid RecruitId,
    string RecruitName,
    DateTime StartDate,
    DateTime EndDate,
    List<string> Categories,
    ReportFormat Format,
    string? FileUrl,
    DateTime CreatedAt);
