namespace OnboardingDiary.Application.Auth.Dtos;

public record RegisterRequest(
    string Email,
    string Password,
    string Name,
    string Department,
    DateTime StartDate);
