namespace OnboardingDiary.Application.Dashboard.Dtos;

public record RecentEntryDto(
    Guid Id,
    string Title,
    DateTime Date,
    string? Badge);
