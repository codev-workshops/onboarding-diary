namespace OnboardingDiary.Application.Notes.Dtos;

public record UpdateNoteRequest(
    string Title,
    string Content,
    List<string>? Tags,
    bool IsPinned);
