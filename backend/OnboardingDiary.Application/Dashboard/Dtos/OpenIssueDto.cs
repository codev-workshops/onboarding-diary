namespace OnboardingDiary.Application.Dashboard.Dtos;

public record OpenIssueDto(
    Guid Id,
    string Title,
    string Severity,
    DateTime Date);
