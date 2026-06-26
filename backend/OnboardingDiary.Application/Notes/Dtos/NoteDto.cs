namespace OnboardingDiary.Application.Notes.Dtos;

public record NoteDto(
    Guid Id,
    Guid UserId,
    DateTime Date,
    string Title,
    string Content,
    List<string> Tags,
    bool IsPinned,
    DateTime CreatedAt,
    DateTime UpdatedAt);
