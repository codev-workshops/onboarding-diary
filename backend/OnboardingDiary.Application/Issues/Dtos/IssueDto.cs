namespace OnboardingDiary.Application.Issues.Dtos;

public record IssueDto(
    Guid Id,
    Guid UserId,
    DateTime Date,
    string Title,
    string Description,
    string Severity,
    string Status,
    string? ResolutionNotes,
    DateTime? ResolvedAt,
    bool IsEscalated,
    DateTime CreatedAt,
    DateTime UpdatedAt);
