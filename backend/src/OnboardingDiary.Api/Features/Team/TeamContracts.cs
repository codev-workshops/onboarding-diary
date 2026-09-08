namespace OnboardingDiary.Api.Features.Team;

public record TeamMemberResponse(
    int UserId,
    string FullName,
    string Email,
    string? DepartmentName,
    DateOnly? StartDate,
    int? ManagerId,
    string? ManagerName,
    bool IsActive,
    int TaskCount,
    int CompletionPercentage,
    int OpenIssueCount,
    DateTimeOffset? LastActivityAt
);

public record TeamListQuery(
    string? Q,
    int? ManagerId,
    int? UserId = null,
    int Page = 1,
    int PageSize = 20,
    string Sort = "name"
);
