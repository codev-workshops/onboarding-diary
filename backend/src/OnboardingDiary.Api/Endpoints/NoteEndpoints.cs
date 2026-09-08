using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class NoteEndpoints
{
    public static void MapNoteEndpoints(this IEndpointRouteBuilder routes)
    {
        var notes = routes.MapGroup("/api/v1/notes").RequireAuthorization().WithTags("Notes");

        notes
            .MapGet(
                "",
                async (
                    ClaimsPrincipal principal,
                    NoteService service,
                    EntryScopeService scope,
                    CancellationToken ct,
                    DateOnly? from = null,
                    DateOnly? to = null,
                    string? tag = null,
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

                    var query = new NoteListQuery(from, to, tag, q, userId, page, pageSize);

                    return Results.Ok(await service.ListAsync(scopedUserId, query, ct));
                }
            )
            .WithName("ListNotes");

        notes
            .MapGet(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    NoteService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var note = await service.GetAsync(caller, id, ct);
                    return note is null ? Results.NotFound() : Results.Ok(note);
                }
            )
            .WithName("GetNote");

        notes
            .MapPost(
                "",
                async (
                    CreateNoteRequest request,
                    ClaimsPrincipal principal,
                    NoteService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var note = await service.CreateAsync(userId, request, ct);
                    return Results.Created($"/api/v1/notes/{note.Id}", note);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<CreateNoteRequest>()
            .WithName("CreateNote");

        notes
            .MapPatch(
                "/{id:int}",
                async (
                    int id,
                    UpdateNoteRequest request,
                    ClaimsPrincipal principal,
                    NoteService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var note = await service.UpdateAsync(userId, id, request, ct);
                    return note is null ? Results.NotFound() : Results.Ok(note);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<UpdateNoteRequest>()
            .WithName("UpdateNote");

        notes
            .MapDelete(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    NoteService service,
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
            .WithName("DeleteNote");
    }
}
