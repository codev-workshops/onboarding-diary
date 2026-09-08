namespace OnboardingDiary.Api.Domain;

public class FeedbackEntry
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public User? User { get; set; }

    public DateOnly EntryDate { get; set; }

    public required string Title { get; set; }

    public required string Message { get; set; }

    public FeedbackType Type { get; set; } = FeedbackType.Suggestion;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }
}
