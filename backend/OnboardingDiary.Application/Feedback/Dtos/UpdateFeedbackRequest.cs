using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Feedback.Dtos;

public record UpdateFeedbackRequest(
    string Subject,
    FeedbackType Type,
    string Details);
