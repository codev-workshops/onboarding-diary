using OnboardingDiary.Application.Auth.Dtos;

namespace OnboardingDiary.Application.Auth;

public interface IAuthService
{
    Task<RegisterResponse> RegisterAsync(RegisterRequest request);
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<RefreshResponse> RefreshAsync(RefreshRequest request);
    Task LogoutAsync(LogoutRequest request);
    Task ForgotPasswordAsync(ForgotPasswordRequest request);
    Task ResetPasswordAsync(ResetPasswordRequest request);
}
