namespace OnboardingDiary.Domain.Entities;

public class Note : AuditableEntity, ISoftDeletable
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public bool IsPinned { get; set; }
    public bool IsDeleted { get; set; }
}
