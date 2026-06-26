using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Issues.Dtos;

public record CreateIssueRequest(
    DateTime Date,
    string Title,
    string Description,
    IssueSeverity Severity,
    IssueStatus Status = IssueStatus.Open,
    string? ResolutionNotes = null);
