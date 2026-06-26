namespace OnboardingDiary.Application.Users.Dtos;

public record UserListItemDto(
    Guid Id,
    string Name,
    string Email,
    string Role,
    string Department,
    DateTime StartDate,
    bool IsActive);
