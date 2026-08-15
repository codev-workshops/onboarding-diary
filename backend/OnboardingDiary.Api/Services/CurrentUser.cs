using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public CurrentUser(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public bool IsAuthenticated => _accessor.HttpContext?.User.Identity?.IsAuthenticated == true;

    public int Id
    {
        get
        {
            var value = _accessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : throw AppException.Unauthorized();
        }
    }

    public UserRole Role
    {
        get
        {
            var value = _accessor.HttpContext?.User.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<UserRole>(value, out var role) ? role : throw AppException.Unauthorized();
        }
    }
}
