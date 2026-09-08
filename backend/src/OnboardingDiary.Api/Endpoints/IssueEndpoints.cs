using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class IssueEndpoints
{
    public static void MapIssueEndpoints(this IEndpointRouteBuilder routes)
    {
        var issues = routes.MapGroup("/api/v1/issues").RequireAuthorization().WithTags("Issues");

        issues
            .MapGet(
                "",
                async (
                    ClaimsPrincipal principal,
                    IssueService service,
                    EntryScopeService scope,
                    CancellationToken ct,
                    DateOnly? from = null,
                    DateOnly? to = null,
                    IssueSeverity? severity = null,
                    IssueStatus? status = null,
                    string? q = null,
                    int? userId = null,
                    int page = 1,
                    int pageSize = 20
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

                    var query = new IssueListQuery(
                        from,
                        to,
                        severity,
                        status,
                        q,
                        userId,
                        page,
                        pageSize
                    );

                    return Results.Ok(await service.ListAsync(scopedUserId, query, ct));
                }
            )
            .WithName("ListIssues");

        issues
            .MapGet(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    IssueService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var issue = await service.GetAsync(caller, id, ct);
                    return issue is null ? Results.NotFound() : Results.Ok(issue);
                }
            )
            .WithName("GetIssue");

        issues
            .MapPost(
                "",
                async (
                    CreateIssueRequest request,
                    ClaimsPrincipal principal,
                    IssueService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var issue = await service.CreateAsync(userId, request, ct);
                    return Results.Created($"/api/v1/issues/{issue.Id}", issue);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<CreateIssueRequest>()
            .WithName("CreateIssue");

        issues
            .MapPatch(
                "/{id:int}",
                async (
                    int id,
                    UpdateIssueRequest request,
                    ClaimsPrincipal principal,
                    IssueService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var (outcome, issue) = await service.UpdateAsync(userId, id, request, ct);

                    return outcome switch
                    {
                        IssueUpdateOutcome.Updated => Results.Ok(issue),
                        IssueUpdateOutcome.InvalidTransition => Results.Problem(
                            title: "Invalid status transition.",
                            detail: $"An issue cannot move to {request.Status} from its current status.",
                            statusCode: StatusCodes.Status409Conflict
                        ),
                        _ => Results.NotFound(),
                    };
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<UpdateIssueRequest>()
            .WithName("UpdateIssue");

        issues
            .MapDelete(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    IssueService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    return await service.DeleteAsync(userId, id, ct)
                        ? Results.NoContent()
                        : Results.NotFound();
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithName("DeleteIssue");
    }
}
