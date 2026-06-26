namespace OnboardingDiary.Application.Auth.Dtos;

public record RegisterResponse(
    Guid UserId,
    string Email,
    string Name,
    string Role);
