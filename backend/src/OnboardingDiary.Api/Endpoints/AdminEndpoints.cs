using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Admin;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder routes)
    {
        var admin = routes
            .MapGroup("/api/v1/admin")
            .RequireAuthorization(AuthorizationPolicies.AdminOnly)
            .WithTags("Admin");

        admin
            .MapGet(
                "/users",
                async (
                    AdminService service,
                    CancellationToken ct,
                    string? q = null,
                    UserRole? role = null,
                    int? departmentId = null,
                    int? managerId = null,
                    bool? isActive = null,
                    int page = 1,
                    int pageSize = 20,
                    string sort = "name"
                ) =>
                    Results.Ok(
                        await service.ListAsync(
                            new AdminUserListQuery(
                                q,
                                role,
                                departmentId,
                                managerId,
                                isActive,
                                page,
                                pageSize,
                                sort
                            ),
                            ct
                        )
                    )
            )
            .WithName("ListUsers");

        admin
            .MapPost(
                "/users",
                async (CreateUserRequest request, AdminService service, CancellationToken ct) =>
                {
                    var (status, user) = await service.CreateAsync(request, ct);

                    return status switch
                    {
                        AdminUserStatus.Succeeded => Results.Created(
                            $"/api/v1/admin/users/{user!.Id}",
                            user
                        ),
                        AdminUserStatus.EmailAlreadyRegistered => Results.Problem(
                            "That email address is already registered.",
                            statusCode: StatusCodes.Status409Conflict
                        ),
                        _ => Problem(status),
                    };
                }
            )
            .WithValidation<CreateUserRequest>()
            .WithName("CreateUser");

        admin
            .MapPatch(
                "/users/{id:int}",
                async (
                    int id,
                    UpdateUserRequest request,
                    ClaimsPrincipal principal,
                    AdminService service,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } callerId)
                    {
                        return Results.Unauthorized();
                    }

                    var (status, user) = await service.UpdateAsync(callerId, id, request, ct);

                    return status switch
                    {
                        AdminUserStatus.Succeeded => Results.Ok(user),
                        AdminUserStatus.NotFound => Results.NotFound(),
                        _ => Problem(status),
                    };
                }
            )
            .WithValidation<UpdateUserRequest>()
            .WithName("UpdateUser");

        admin
            .MapGet(
                "/stats",
                async (AdminService service, CancellationToken ct) =>
                    Results.Ok(await service.StatsAsync(ct))
            )
            .WithName("GetAdminStats");
    }

    private static IResult Problem(AdminUserStatus status) =>
        status switch
        {
            AdminUserStatus.UnknownDepartment => Results.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["DepartmentId"] = ["Unknown or inactive department."],
                }
            ),
            AdminUserStatus.InvalidManager => Results.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["ManagerId"] = ["Only a recruit can be assigned to an active manager."],
                }
            ),
            _ => Results.ValidationProblem(
                new Dictionary<string, string[]>
                {
                    ["Role"] = ["An admin cannot change their own role or deactivate themselves."],
                }
            ),
        };
}
