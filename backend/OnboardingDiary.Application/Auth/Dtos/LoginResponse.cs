namespace OnboardingDiary.Application.Auth.Dtos;

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    UserDto User);
