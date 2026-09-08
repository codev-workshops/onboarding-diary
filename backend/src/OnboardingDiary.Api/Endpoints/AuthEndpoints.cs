using System.Security.Claims;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Infrastructure.Auth;

namespace OnboardingDiary.Api.Endpoints;

public static class AuthEndpoints
{
    public const string LoginRateLimitPolicy = "auth-login";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/v1/auth").WithTags("Auth");

        group
            .MapPost(
                "/signup",
                async (SignupRequest request, AuthService auth, CancellationToken ct) =>
                {
                    var (status, response) = await auth.SignupAsync(request, ct);

                    return status switch
                    {
                        SignupStatus.Created => Results.Created("/api/v1/me", response),
                        SignupStatus.EmailAlreadyRegistered => Results.Problem(
                            title: "Email already registered",
                            detail: "An account already exists for this email address.",
                            statusCode: StatusCodes.Status409Conflict
                        ),
                        _ => Results.ValidationProblem(
                            new Dictionary<string, string[]>
                            {
                                ["DepartmentId"] = ["Unknown or inactive department."],
                            }
                        ),
                    };
                }
            )
            .AllowAnonymous()
            .WithValidation<SignupRequest>()
            .WithName("Signup");

        group
            .MapPost(
                "/login",
                async (LoginRequest request, AuthService auth, CancellationToken ct) =>
                {
                    var response = await auth.LoginAsync(request, ct);

                    return response is null
                        ? Results.Problem(
                            title: "Invalid credentials",
                            detail: "Invalid email or password.",
                            statusCode: StatusCodes.Status401Unauthorized
                        )
                        : Results.Ok(response);
                }
            )
            .AllowAnonymous()
            .RequireRateLimiting(LoginRateLimitPolicy)
            .WithValidation<LoginRequest>()
            .WithName("Login");

        group
            .MapPost(
                "/change-password",
                async (
                    ChangePasswordRequest request,
                    ClaimsPrincipal principal,
                    AuthService auth,
                    CancellationToken ct
                ) =>
                {
                    if (principal.UserId() is not { } userId)
                    {
                        return Results.Unauthorized();
                    }

                    var status = await auth.ChangePasswordAsync(userId, request, ct);

                    return status switch
                    {
                        ChangePasswordStatus.Changed => Results.NoContent(),
                        ChangePasswordStatus.UserNotFound => Results.Unauthorized(),
                        _ => Results.Problem(
                            title: "Incorrect password",
                            detail: "The current password is incorrect.",
                            statusCode: StatusCodes.Status400BadRequest
                        ),
                    };
                }
            )
            .RequireAuthorization()
            .WithValidation<ChangePasswordRequest>()
            .WithName("ChangePassword");
    }
}
