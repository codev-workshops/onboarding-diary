namespace OnboardingDiary.Application.Dashboard.Dtos;

public record RecentEntriesDto(
    IReadOnlyList<RecentEntryDto> Tasks,
    IReadOnlyList<RecentEntryDto> Issues,
    IReadOnlyList<RecentEntryDto> Feedback,
    IReadOnlyList<RecentEntryDto> Notes);
