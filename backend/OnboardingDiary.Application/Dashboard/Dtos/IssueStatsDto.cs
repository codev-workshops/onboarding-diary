namespace OnboardingDiary.Application.Dashboard.Dtos;

public record IssueStatsDto(
    int Total,
    int Open,
    int InProgress,
    int Resolved,
    int Closed,
    int Critical,
    int Escalated);
