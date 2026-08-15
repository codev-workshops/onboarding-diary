using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) CreateToken(User user);
}
