using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;

namespace OnboardingDiary.IntegrationTests;

public class AuthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static SignupRequest Signup(string email) =>
        new(email, "correct-horse-9", "Ada Lovelace", null, new DateOnly(2026, 1, 5));

    private async Task<AuthResponse> SignupAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/signup", Signup(email));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
    }

    [Fact]
    public async Task Signup_creates_a_recruit_and_returns_a_token()
    {
        var auth = await SignupAsync(factory.CreateClient(), "signup@example.com");

        Assert.False(string.IsNullOrWhiteSpace(auth.AccessToken));
        Assert.Equal(UserRole.Recruit, auth.User.Role);
        Assert.Equal("signup@example.com", auth.User.Email);
    }

    [Fact]
    public async Task Signup_rejects_a_weak_password()
    {
        var response = await factory
            .CreateClient()
            .PostAsJsonAsync(
                "/api/v1/auth/signup",
                Signup("weak@example.com") with
                {
                    Password = "short1",
                }
            );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("Password", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Signup_conflicts_on_a_duplicate_email()
    {
        var client = factory.CreateClient();
        await SignupAsync(client, "duplicate@example.com");

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/signup",
            Signup("DUPLICATE@example.com")
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Login_returns_a_token_and_rejects_a_bad_password()
    {
        var client = factory.CreateClient();
        await SignupAsync(client, "login@example.com");

        var ok = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("login@example.com", "correct-horse-9")
        );
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.False(
            string.IsNullOrWhiteSpace(
                (await ok.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!.AccessToken
            )
        );

        var wrong = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest("login@example.com", "wrong-password-1")
        );
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        var problem = await wrong.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Invalid email or password.", problem!.Detail);
    }

    [Fact]
    public async Task Me_requires_a_bearer_token()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_rejects_an_invalid_token()
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            "not-a-real-token"
        );

        var response = await client.GetAsync("/api/v1/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_returns_and_updates_the_profile_for_a_bearer_token()
    {
        var client = factory.CreateClient();
        var auth = await SignupAsync(client, "profile@example.com");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            auth.AccessToken
        );

        var me = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/me", JsonOptions.Api);
        Assert.Equal(auth.User.Id, me!.Id);

        var departments = await client.GetFromJsonAsync<List<DepartmentListItem>>(
            "/api/v1/departments"
        );
        var department = departments!.First();

        var patch = await client.PatchAsJsonAsync(
            "/api/v1/me",
            new
            {
                fullName = "Ada L.",
                departmentId = department.Id,
                startDate = "2026-02-01",
            }
        );

        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = (await patch.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions.Api))!;
        Assert.Equal("Ada L.", updated.FullName);
        Assert.Equal(department.Id, updated.DepartmentId);
        Assert.Equal(department.Name, updated.DepartmentName);
        Assert.Equal(new DateOnly(2026, 2, 1), updated.StartDate);
    }

    [Fact]
    public async Task Change_password_replaces_the_credential()
    {
        var client = factory.CreateClient();
        var auth = await SignupAsync(client, "change@example.com");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            auth.AccessToken
        );

        var wrongCurrent = await client.PostAsJsonAsync(
            "/api/v1/auth/change-password",
            new ChangePasswordRequest("not-the-password-1", "brand-new-secret-2")
        );
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);

        var changed = await client.PostAsJsonAsync(
            "/api/v1/auth/change-password",
            new ChangePasswordRequest("correct-horse-9", "brand-new-secret-2")
        );
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);

        var relogin = await factory
            .CreateClient()
            .PostAsJsonAsync(
                "/api/v1/auth/login",
                new LoginRequest("change@example.com", "brand-new-secret-2")
            );
        Assert.Equal(HttpStatusCode.OK, relogin.StatusCode);
    }

    private record DepartmentListItem(int Id, string Name);
}
