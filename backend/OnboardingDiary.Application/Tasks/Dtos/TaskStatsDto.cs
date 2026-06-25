namespace OnboardingDiary.Application.Tasks.Dtos;

public record TaskStatsDto(
    int Total,
    int Completed,
    int InProgress,
    int Pending,
    double CompletionRate);
