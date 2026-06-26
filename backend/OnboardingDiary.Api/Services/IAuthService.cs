using OnboardingDiary.Api.DTOs.Auth;

namespace OnboardingDiary.Api.Services;

public interface IAuthService
{
    Task<RegisterResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}
