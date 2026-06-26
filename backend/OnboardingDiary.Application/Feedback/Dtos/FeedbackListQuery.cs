using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Feedback.Dtos;

public record FeedbackListQuery(
    int Page = 1,
    int Limit = 20,
    FeedbackType? Type = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    Guid? RecruitId = null,
    string? Department = null);
