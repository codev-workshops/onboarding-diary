using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Domain.Entities;

public class Feedback : AuditableEntity, ISoftDeletable
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime Date { get; set; }
    public string Subject { get; set; } = string.Empty;
    public FeedbackType Type { get; set; }
    public string Details { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
}
