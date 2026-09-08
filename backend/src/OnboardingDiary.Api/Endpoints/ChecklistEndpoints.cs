using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Features.Checklists;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class ChecklistEndpoints
{
    public static void MapChecklistEndpoints(this IEndpointRouteBuilder routes)
    {
        MapTemplateEndpoints(routes);
        MapAssignmentEndpoints(routes);
    }

    private static void MapTemplateEndpoints(IEndpointRouteBuilder routes)
    {
        var templates = routes
            .MapGroup("/api/v1/checklist-templates")
            .RequireAuthorization()
            .WithTags("Checklists");

        templates
            .MapGet(
                "",
                async (
                    ChecklistService service,
                    CancellationToken ct,
                    string? q = null,
                    int? departmentId = null,
                    bool? isActive = null,
                    int page = 1,
                    int pageSize = 20,
                    string sort = "name"
                ) =>
                    Results.Ok(
                        await service.ListTemplatesAsync(
                            new ChecklistTemplateListQuery(
                                q,
                                departmentId,
                                isActive,
                                page,
                                pageSize,
                                sort
                            ),
                            ct
                        )
                    )
            )
            .RequireAuthorization(AuthorizationPolicies.ManagerOrAdmin)
            .WithName("ListChecklistTemplates");

        templates
            .MapGet(
                "/available",
                async (ClaimsPrincipal principal, ChecklistService service, CancellationToken ct) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    return Results.Ok(await service.ListAvailableAsync(userId, ct));
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithName("ListAvailableChecklistTemplates");

        templates
            .MapGet(
                "/{id:int}",
                async (int id, ChecklistService service, CancellationToken ct) =>
                {
                    var template = await service.GetTemplateAsync(id, ct);
                    return template is null ? Results.NotFound() : Results.Ok(template);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.ManagerOrAdmin)
            .WithName("GetChecklistTemplate");

        templates
            .MapPost(
                "",
                async (
                    SaveChecklistTemplateRequest request,
                    ChecklistService service,
                    CancellationToken ct
                ) =>
                {
                    var (outcome, template) = await service.CreateTemplateAsync(request, ct);

                    return outcome switch
                    {
                        ChecklistSaveOutcome.Saved => Results.Created(
                            $"/api/v1/checklist-templates/{template!.Id}",
                            template
                        ),
                        _ => Problem(outcome),
                    };
                }
            )
            .RequireAuthorization(AuthorizationPolicies.AdminOnly)
            .WithValidation<SaveChecklistTemplateRequest>()
            .WithName("CreateChecklistTemplate");

        templates
            .MapPut(
                "/{id:int}",
                async (
                    int id,
                    SaveChecklistTemplateRequest request,
                    ChecklistService service,
                    CancellationToken ct
                ) =>
                {
                    var (outcome, template) = await service.UpdateTemplateAsync(id, request, ct);

                    return outcome switch
                    {
                        ChecklistSaveOutcome.Saved => Results.Ok(template),
                        ChecklistSaveOutcome.NotFound => Results.NotFound(),
                        _ => Problem(outcome),
                    };
                }
            )
            .RequireAuthorization(AuthorizationPolicies.AdminOnly)
            .WithValidation<SaveChecklistTemplateRequest>()
            .WithName("UpdateChecklistTemplate");

        templates
            .MapDelete(
                "/{id:int}",
                async (int id, ChecklistService service, CancellationToken ct) =>
                    await service.DeleteTemplateAsync(id, ct) switch
                    {
                        ChecklistDeleteOutcome.Deleted => Results.NoContent(),
                        ChecklistDeleteOutcome.HasAssignments => Results.Problem(
                            title: "Template already applied.",
                            detail: "Recruits have applied this template, so it can only be retired by setting isActive to false.",
                            statusCode: StatusCodes.Status409Conflict
                        ),
                        _ => Results.NotFound(),
                    }
            )
            .RequireAuthorization(AuthorizationPolicies.AdminOnly)
            .WithName("DeleteChecklistTemplate");
    }

    private static void MapAssignmentEndpoints(IEndpointRouteBuilder routes)
    {
        var checklists = routes
            .MapGroup("/api/v1/checklists")
            .RequireAuthorization()
            .WithTags("Checklists");

        checklists
            .MapPost(
                "/apply",
                async (
                    ApplyChecklistRequest request,
                    ClaimsPrincipal principal,
                    ChecklistService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var (outcome, result) = await service.ApplyAsync(userId, request.TemplateId, ct);

                    return outcome switch
                    {
                        ChecklistApplyOutcome.Applied => Results.Created(
                            $"/api/v1/checklists/{result!.Progress.AssignmentId}",
                            result
                        ),
                        ChecklistApplyOutcome.AlreadyApplied => Results.Problem(
                            title: "Checklist already applied.",
                            detail: "This template has already been applied and cannot be applied again.",
                            statusCode: StatusCodes.Status409Conflict
                        ),
                        _ => Results.NotFound(),
                    };
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<ApplyChecklistRequest>()
            .WithName("ApplyChecklistTemplate");

        checklists
            .MapGet(
                "/progress",
                async (
                    ClaimsPrincipal principal,
                    EntryScopeService scope,
                    ChecklistService service,
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

                    return Results.Ok(await service.ListProgressAsync(scopedUserId, ct));
                }
            )
            .WithName("ListChecklistProgress");

        checklists
            .MapGet(
                "/{assignmentId:int}",
                async (
                    int assignmentId,
                    ClaimsPrincipal principal,
                    EntryScopeService scope,
                    ChecklistService service,
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

                    var assignment = await service.GetAssignmentAsync(scopedUserId, assignmentId, ct);
                    return assignment is null ? Results.NotFound() : Results.Ok(assignment);
                }
            )
            .WithName("GetChecklistAssignment");
    }

    private static IResult Problem(ChecklistSaveOutcome outcome) =>
        outcome switch
        {
            ChecklistSaveOutcome.NameTaken => Results.Problem(
                title: "Template name already used.",
                detail: "Another checklist template already uses that name.",
                statusCode: StatusCodes.Status409Conflict
            ),
            _ => Results.ValidationProblem(
                new Dictionary<string, string[]> { ["DepartmentId"] = ["Unknown department."] }
            ),
        };
}
