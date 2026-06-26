namespace OnboardingDiary.Domain.Entities;

public class AuditLog : AuditableEntity
{
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? EntityName { get; set; }
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public DateTime Timestamp { get; set; }
}
