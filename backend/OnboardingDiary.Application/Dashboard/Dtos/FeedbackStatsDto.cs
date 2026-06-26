namespace OnboardingDiary.Application.Dashboard.Dtos;

public record FeedbackStatsDto(
    int Total,
    int Positive,
    int Suggestion,
    int Concern);
