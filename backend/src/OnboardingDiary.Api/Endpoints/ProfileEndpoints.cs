using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Features.Profile;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this IEndpointRouteBuilder routes)
    {
        var me = routes.MapGroup("/api/v1/me").RequireAuthorization().WithTags("Profile");

        me.MapGet(
                "",
                async (ClaimsPrincipal principal, ProfileService profiles, CancellationToken ct) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var profile = await profiles.GetAsync(userId, ct);
                    return profile is null ? Results.Unauthorized() : Results.Ok(profile);
                }
            )
            .WithName("GetProfile");

        me.MapPatch(
                "",
                async (
                    UpdateProfileRequest request,
                    ClaimsPrincipal principal,
                    ProfileService profiles,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var (status, profile) = await profiles.UpdateAsync(userId, request, ct);

                    return status switch
                    {
                        UpdateProfileStatus.Updated => Results.Ok(profile),
                        UpdateProfileStatus.UserNotFound => Results.Unauthorized(),
                        _ => Results.ValidationProblem(
                            new Dictionary<string, string[]>
                            {
                                ["DepartmentId"] = ["Unknown or inactive department."],
                            }
                        ),
                    };
                }
            )
            .WithValidation<UpdateProfileRequest>()
            .WithName("UpdateProfile");

        routes
            .MapGet(
                "/api/v1/departments",
                async (ProfileService profiles, CancellationToken ct) =>
                    Results.Ok(await profiles.ListDepartmentsAsync(ct))
            )
            .AllowAnonymous()
            .WithTags("Profile")
            .WithName("ListDepartments");
    }
}
