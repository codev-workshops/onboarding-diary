namespace OnboardingDiary.Application.Users.Dtos;

public record UpdateProfileRequest(
    string Name,
    string Department,
    DateTime StartDate,
    string? AvatarUrl);
