namespace OnboardingDiary.Application.Feedback.Dtos;

public record FeedbackListItemDto(
    Guid Id,
    Guid UserId,
    DateTime Date,
    string Subject,
    string Type,
    string Details,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? AuthorName,
    string? AuthorDepartment);
