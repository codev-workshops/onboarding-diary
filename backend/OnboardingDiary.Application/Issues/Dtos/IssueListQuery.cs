using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Issues.Dtos;

public record IssueListQuery(
    int Page = 1,
    int Limit = 20,
    IssueStatus? Status = null,
    IssueSeverity? Severity = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    Guid? RecruitId = null);
