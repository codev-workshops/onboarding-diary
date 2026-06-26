namespace OnboardingDiary.Application.Dashboard.Dtos;

public record TeamRecruitDto(
    Guid Id,
    string Name,
    string Department,
    DateTime StartDate,
    int DaysSinceStart,
    double CompletionPercentage,
    int OpenIssueCount,
    int EscalatedIssueCount);
