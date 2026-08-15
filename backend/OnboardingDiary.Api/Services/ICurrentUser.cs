using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public interface ICurrentUser
{
    int Id { get; }

    UserRole Role { get; }

    bool IsAuthenticated { get; }
}
