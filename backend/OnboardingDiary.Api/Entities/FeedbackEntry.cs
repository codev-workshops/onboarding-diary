using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Entities;

public class FeedbackEntry
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Date { get; set; }
    public string Subject { get; set; } = string.Empty;
    public FeedbackType Type { get; set; }
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
