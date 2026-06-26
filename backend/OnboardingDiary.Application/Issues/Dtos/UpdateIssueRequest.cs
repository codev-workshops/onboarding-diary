using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Issues.Dtos;

public record UpdateIssueRequest(
    string Title,
    string Description,
    IssueSeverity Severity,
    IssueStatus Status,
    string? ResolutionNotes);
