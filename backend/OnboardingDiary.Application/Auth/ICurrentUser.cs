namespace OnboardingDiary.Application.Auth;

public interface ICurrentUser
{
    Guid? UserId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}
