using System.Security.Claims;
using FluentValidation;
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

        routes
            .MapGet(
                "/api/v1/dashboard/trends",
                async (
                    ClaimsPrincipal principal,
                    EntryScopeService scope,
                    TrendsService trends,
                    IValidator<TrendsQuery> validator,
                    CancellationToken ct,
                    int? userId = null,
                    DateOnly? from = null,
                    DateOnly? to = null
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var query = new TrendsQuery(from, to, userId);
                    var validation = await validator.ValidateAsync(query, ct);
                    if (!validation.IsValid)
                    {
                        return Results.ValidationProblem(
                            validation
                                .Errors.GroupBy(failure => failure.PropertyName)
                                .ToDictionary(
                                    group => group.Key,
                                    group => group.Select(failure => failure.ErrorMessage).ToArray()
                                )
                        );
                    }

                    var (access, scopedUserId) = await scope.ResolveAsync(caller, userId, ct);
                    if (access == EntryAccess.Denied)
                    {
                        return Results.NotFound();
                    }

                    return Results.Ok(await trends.GetAsync(scopedUserId, query, ct));
                }
            )
            .RequireAuthorization()
            .ProducesValidationProblem()
            .WithTags("Dashboard")
            .WithName("GetDashboardTrends");
    }
}
