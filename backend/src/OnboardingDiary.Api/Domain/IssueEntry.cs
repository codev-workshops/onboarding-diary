namespace OnboardingDiary.Api.Domain;

public class IssueEntry
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateOnly EntryDate { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public IssueSeverity Severity { get; set; } = IssueSeverity.Medium;

    public IssueStatus Status { get; set; } = IssueStatus.Open;

    public string? ResolutionNotes { get; set; }

    public DateTimeOffset? ResolvedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
