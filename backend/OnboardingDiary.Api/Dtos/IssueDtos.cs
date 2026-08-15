using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Dtos;

public class IssueDto
{
    public int Id { get; init; }

    public int UserId { get; init; }

    public string UserName { get; init; } = string.Empty;

    public DateTime Date { get; init; }

    public string Title { get; init; } = string.Empty;

    public string? Description { get; init; }

    public IssueSeverity Severity { get; init; }

    public IssueStatus Status { get; init; }

    public string? ResolutionNotes { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime UpdatedAtUtc { get; init; }
}

public class SaveIssueRequest
{
    public DateTime Date { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public IssueSeverity Severity { get; set; }

    public IssueStatus Status { get; set; }

    public string? ResolutionNotes { get; set; }
}

public class IssueQuery : PagedQuery
{
    public IssueSeverity? Severity { get; set; }

    public IssueStatus? Status { get; set; }
}
