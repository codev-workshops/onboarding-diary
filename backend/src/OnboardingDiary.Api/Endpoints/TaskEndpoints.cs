using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class TaskEndpoints
{
    public static void MapTaskEndpoints(this IEndpointRouteBuilder routes)
    {
        var tasks = routes.MapGroup("/api/v1/tasks").RequireAuthorization().WithTags("Tasks");

        tasks
            .MapGet(
                "",
                async (
                    ClaimsPrincipal principal,
                    TaskService service,
                    CancellationToken ct,
                    DateOnly? from = null,
                    DateOnly? to = null,
                    TaskCategory? category = null,
                    TaskEntryStatus? status = null,
                    TaskPriority? priority = null,
                    string? q = null,
                    int? userId = null,
                    int page = 1,
                    int pageSize = 20,
                    string sort = "-entry_date"
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var (access, scopedUserId) = await service.ResolveScopeAsync(
                        caller,
                        userId,
                        ct
                    );
                    if (access == TaskAccess.Denied)
                    {
                        return Results.NotFound();
                    }

                    var query = new TaskListQuery(
                        from,
                        to,
                        category,
                        status,
                        priority,
                        q,
                        userId,
                        page,
                        pageSize,
                        sort
                    );

                    return Results.Ok(await service.ListAsync(scopedUserId, query, ct));
                }
            )
            .WithName("ListTasks");

        tasks
            .MapGet(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    TaskService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.Caller() is not { } caller)
                    {
                        return Results.Unauthorized();
                    }

                    var task = await service.GetAsync(caller, id, ct);
                    return task is null ? Results.NotFound() : Results.Ok(task);
                }
            )
            .WithName("GetTask");

        tasks
            .MapPost(
                "",
                async (
                    CreateTaskRequest request,
                    ClaimsPrincipal principal,
                    TaskService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var task = await service.CreateAsync(userId, request, ct);
                    return Results.Created($"/api/v1/tasks/{task.Id}", task);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<CreateTaskRequest>()
            .WithName("CreateTask");

        tasks
            .MapPatch(
                "/{id:int}",
                async (
                    int id,
                    UpdateTaskRequest request,
                    ClaimsPrincipal principal,
                    TaskService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var task = await service.UpdateAsync(userId, id, request, ct);
                    return task is null ? Results.NotFound() : Results.Ok(task);
                }
            )
            .RequireAuthorization(AuthorizationPolicies.RecruitOnly)
            .WithValidation<UpdateTaskRequest>()
            .WithName("UpdateTask");

        tasks
            .MapDelete(
                "/{id:int}",
                async (
                    int id,
                    ClaimsPrincipal principal,
                    TaskService service,
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
            .WithName("DeleteTask");
    }
}
