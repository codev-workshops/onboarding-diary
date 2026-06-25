namespace OnboardingDiary.Domain.Entities;

public class PasswordResetToken : AuditableEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public bool IsUsed { get; set; }
}
