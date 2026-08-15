namespace OnboardingDiary.Api.Models;

public class AdditionalNote
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateTime Date { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Content { get; set; }

    /// <summary>Comma separated tag list; exposed as an array through DTOs.</summary>
    public string Tags { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
