namespace OnboardingDiary.Application.Notes.Dtos;

public record CreateNoteRequest(
    DateTime Date,
    string Title,
    string Content,
    List<string>? Tags,
    bool IsPinned);
