namespace OnboardingDiary.Api.Models;

public class FeedbackNote
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateTime Date { get; set; }

    public string Subject { get; set; } = string.Empty;

    public FeedbackType Type { get; set; }

    public string? Details { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
