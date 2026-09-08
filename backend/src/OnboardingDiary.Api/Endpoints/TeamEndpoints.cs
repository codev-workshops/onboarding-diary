using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Features.Team;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class TeamEndpoints
{
    public static void MapTeamEndpoints(this IEndpointRouteBuilder routes)
    {
        var team = routes
            .MapGroup("/api/v1/team")
            .RequireAuthorization(AuthorizationPolicies.ManagerOrAdmin)
            .WithTags("Team");

        team
            .MapGet(
                "/recruits",
                async (
                    ClaimsPrincipal principal,
                    TeamService service,
                    CancellationToken ct,
                    string? q = null,
                    int? managerId = null,
                    int page = 1,
                    int pageSize = 20,
                    string sort = "name"
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var query = new TeamListQuery(
                        q,
                        managerId,
                        Page: page,
                        PageSize: pageSize,
                        Sort: sort
                    );
                    return Results.Ok(await service.ListAsync(caller, query, ct));
                }
            )
            .WithName("ListTeamRecruits");

        team
            .MapGet(
                "/recruits/{userId:int}",
                async (
                    int userId,
                    ClaimsPrincipal principal,
                    TeamService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var member = await service.GetAsync(caller, userId, ct);
                    return member is null ? Results.NotFound() : Results.Ok(member);
                }
            )
            .WithName("GetTeamRecruit");
    }
}
