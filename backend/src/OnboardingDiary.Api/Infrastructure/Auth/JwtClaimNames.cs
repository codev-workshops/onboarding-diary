using System.Security.Claims;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Infrastructure.Auth;

public static class JwtClaimNames
{
    public const string Subject = "sub";

    public const string Email = "email";

    public const string Role = "role";

    public static int? UserId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(Subject), out var id) ? id : null;

    public static Caller? Caller(this ClaimsPrincipal principal) =>
        principal.UserId() is { } userId
        && Enum.TryParse<UserRole>(principal.FindFirstValue(Role), out var role)
            ? new Caller(userId, role)
            : null;
}
