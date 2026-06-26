namespace OnboardingDiary.Application.Auth.Dtos;

public record UserDto(
    Guid Id,
    string Email,
    string Name,
    string Role,
    string Department,
    DateTime StartDate,
    string? AvatarUrl,
    Guid? ManagerId,
    bool IsActive);
