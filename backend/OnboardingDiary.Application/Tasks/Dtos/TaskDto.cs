namespace OnboardingDiary.Application.Tasks.Dtos;

public record TaskDto(
    Guid Id,
    Guid UserId,
    DateTime Date,
    string Title,
    string? Description,
    string Category,
    string Status,
    string Priority,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);
