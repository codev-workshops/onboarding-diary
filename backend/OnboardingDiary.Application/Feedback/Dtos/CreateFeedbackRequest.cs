using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Feedback.Dtos;

public record CreateFeedbackRequest(
    DateTime Date,
    string Subject,
    FeedbackType Type,
    string Details);
