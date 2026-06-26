using OnboardingDiary.Domain.Enums;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Domain.Entities;

public class TaskEntity : AuditableEntity, ISoftDeletable
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskCategory Category { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    public Priority Priority { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsDeleted { get; set; }
}
