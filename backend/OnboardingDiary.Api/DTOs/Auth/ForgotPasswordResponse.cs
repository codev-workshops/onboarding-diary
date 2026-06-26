namespace OnboardingDiary.Api.DTOs.Auth;

public class ForgotPasswordResponse
{
    public string Message { get; set; } = string.Empty;
    public string? Token { get; set; }
}
