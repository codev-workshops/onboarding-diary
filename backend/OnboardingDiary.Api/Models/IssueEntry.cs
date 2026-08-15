namespace OnboardingDiary.Api.Models;

public class IssueEntry
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateTime Date { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public IssueSeverity Severity { get; set; }

    public IssueStatus Status { get; set; }

    public string? ResolutionNotes { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
