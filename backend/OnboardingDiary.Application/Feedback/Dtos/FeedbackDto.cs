namespace OnboardingDiary.Application.Feedback.Dtos;

public record FeedbackDto(
    Guid Id,
    Guid UserId,
    DateTime Date,
    string Subject,
    string Type,
    string Details,
    DateTime CreatedAt,
    DateTime UpdatedAt);
