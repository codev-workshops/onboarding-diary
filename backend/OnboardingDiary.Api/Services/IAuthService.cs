using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IAuthService
{
    Task<AuthResponse> SignupAsync(SignupRequest request, CancellationToken cancellationToken = default);

    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    Task<UserDto> GetCurrentUserAsync(CancellationToken cancellationToken = default);
}
