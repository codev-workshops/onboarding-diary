using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Domain.Entities;

public class Issue : AuditableEntity, ISoftDeletable
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IssueSeverity Severity { get; set; }
    public IssueStatus Status { get; set; } = IssueStatus.Open;
    public string? ResolutionNotes { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool IsEscalated { get; set; }
    public bool IsDeleted { get; set; }
}
