using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Api.Authorization;

public class AssignedRecruitAuthorizationHandler : AuthorizationHandler<AssignedRecruitRequirement, Guid>
{
    private readonly AppDbContext _context;

    public AssignedRecruitAuthorizationHandler(AppDbContext context)
    {
        _context = context;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AssignedRecruitRequirement requirement,
        Guid targetRecruitId)
    {
        var userIdClaim = context.User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                          ?? context.User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdClaim, out var callerId))
            return;

        var roleClaim = context.User.FindFirstValue(ClaimTypes.Role);

        if (roleClaim == nameof(Role.Admin))
        {
            context.Succeed(requirement);
            return;
        }

        if (callerId == targetRecruitId)
        {
            context.Succeed(requirement);
            return;
        }

        if (roleClaim == nameof(Role.Manager))
        {
            var recruit = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == targetRecruitId);

            if (recruit is not null && recruit.ManagerId == callerId)
            {
                context.Succeed(requirement);
            }
        }
    }
}
