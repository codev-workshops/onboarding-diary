using System.Security.Claims;
using OnboardingDiary.Api.Features.Dashboard;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class DashboardEndpoints
{
    public static void MapDashboardEndpoints(this IEndpointRouteBuilder routes)
    {
        routes
            .MapGet(
                "/api/v1/dashboard",
                async (
                    ClaimsPrincipal principal,
                    EntryScopeService scope,
                    DashboardService dashboard,
                    CancellationToken ct,
                    int? userId = null
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var (access, scopedUserId) = await scope.ResolveAsync(caller, userId, ct);
                    if (access == EntryAccess.Denied)
                    {
                        return Results.NotFound();
                    }

                    return Results.Ok(await dashboard.GetAsync(scopedUserId, ct));
                }
            )
            .RequireAuthorization()
            .WithTags("Dashboard")
            .WithName("GetDashboard");
    }
}
