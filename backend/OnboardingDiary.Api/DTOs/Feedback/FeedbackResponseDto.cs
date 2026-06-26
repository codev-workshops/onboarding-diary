using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.DTOs.Feedback;

public class FeedbackResponseDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Date { get; set; }
    public string Subject { get; set; } = string.Empty;
    public FeedbackType Type { get; set; }
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
