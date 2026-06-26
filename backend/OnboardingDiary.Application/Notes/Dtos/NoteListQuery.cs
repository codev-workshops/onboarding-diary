namespace OnboardingDiary.Application.Notes.Dtos;

public record NoteListQuery(
    int Page = 1,
    int Limit = 20,
    string? Search = null,
    string? Tags = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null);
