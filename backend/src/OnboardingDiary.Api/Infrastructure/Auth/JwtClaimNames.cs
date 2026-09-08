using System.Security.Claims;

namespace OnboardingDiary.Api.Infrastructure.Auth;

public static class JwtClaimNames
{
    public const string Subject = "sub";

    public const string Email = "email";

    public const string Role = "role";

    public static int? UserId(this ClaimsPrincipal principal) =>
        int.TryParse(principal.FindFirstValue(Subject), out var id) ? id : null;
}
