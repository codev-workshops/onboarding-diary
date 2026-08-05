using System.Security.Claims;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal) =>
        Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Authenticated principal has no user id claim."));

    public static UserRole GetRole(this ClaimsPrincipal principal) =>
        Enum.Parse<UserRole>(principal.FindFirstValue(ClaimTypes.Role)
            ?? throw new InvalidOperationException("Authenticated principal has no role claim."));
}
