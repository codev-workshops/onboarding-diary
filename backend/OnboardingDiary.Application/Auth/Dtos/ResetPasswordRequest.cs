namespace OnboardingDiary.Application.Auth.Dtos;

public record ResetPasswordRequest(string Token, string NewPassword);
