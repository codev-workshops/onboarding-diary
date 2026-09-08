using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class FeedbackEndpoints
{
    public static void MapFeedbackEndpoints(this IEndpointRouteBuilder routes)
    {
        var feedback = routes
            .MapGroup("/api/v1/feedback")
            .RequireAuthorization()
            .WithTags("Feedback");

        feedback
            .MapGet(
                "",
                async (
                    ClaimsPrincipal principal,
                    FeedbackService service,
                    EntryScopeService scope,
                    CancellationToken ct,
                    DateOnly? from = null,
                    DateOnly? to = null,
                    FeedbackType? type = null,
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

                    var query = new FeedbackListQuery(from, to, type, q, userId, page, pageSize);

                    return Results.Ok(await service.ListAsync(scopedUserId, query, ct));
                }
            )
            .WithName("ListFeedback");

        feedback
            .MapGet(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    FeedbackService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var entry = await service.GetAsync(caller, id, ct);
                    return entry is null ? Results.NotFound() : Results.Ok(entry);
                }
            )
            .WithName("GetFeedback");

        feedback
            .MapPost(
                "",
                async (
                    CreateFeedbackRequest request,
                    ClaimsPrincipal principal,
                    FeedbackService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var entry = await service.CreateAsync(userId, request, ct);
                    return Results.Created($"/api/v1/feedback/{entry.Id}", entry);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<CreateFeedbackRequest>()
            .WithName("CreateFeedback");

        feedback
            .MapPatch(
                "/{id:int}",
                async (
                    int id,
                    UpdateFeedbackRequest request,
                    ClaimsPrincipal principal,
                    FeedbackService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var entry = await service.UpdateAsync(userId, id, request, ct);
                    return entry is null ? Results.NotFound() : Results.Ok(entry);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<UpdateFeedbackRequest>()
            .WithName("UpdateFeedback");

        feedback
            .MapDelete(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    FeedbackService service,
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
            .WithName("DeleteFeedback");
    }
}
