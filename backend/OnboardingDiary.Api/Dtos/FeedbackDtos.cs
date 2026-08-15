using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Dtos;

public class FeedbackDto
{
    public int Id { get; init; }

    public int UserId { get; init; }

    public string UserName { get; init; } = string.Empty;

    public DateTime Date { get; init; }

    public string Subject { get; init; } = string.Empty;

    public FeedbackType Type { get; init; }

    public string? Details { get; init; }

    public DateTime CreatedAtUtc { get; init; }

    public DateTime UpdatedAtUtc { get; init; }
}

public class SaveFeedbackRequest
{
    public DateTime Date { get; set; }

    public string Subject { get; set; } = string.Empty;

    public FeedbackType Type { get; set; }

    public string? Details { get; set; }
}

public class FeedbackQuery : PagedQuery
{
    public FeedbackType? Type { get; set; }
}
