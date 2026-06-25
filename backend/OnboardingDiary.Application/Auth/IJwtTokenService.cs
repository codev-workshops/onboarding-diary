using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Auth;

public interface IJwtTokenService
{
    string CreateAccessToken(User user);
    (string RawToken, RefreshToken Entity) CreateRefreshToken(Guid userId);
}
