using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Tests;

public class AuthTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly SignupRequest Recruit = new(
        "Recruit@Example.com", "Passw0rd1", "Rec Ruit", "Engineering", new DateOnly(2026, 8, 1));

    [Fact]
    public async Task Signup_creates_recruit_and_returns_token()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/signup", Recruit with { Email = "signup@example.com" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body.Token));
        Assert.Equal(UserRole.NewRecruit, body.User.Role);
        Assert.Equal("signup@example.com", body.User.Email);
    }

    [Fact]
    public async Task Signup_rejects_weak_password()
    {
        var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/signup", Recruit with { Email = "weak@example.com", Password = "short" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Signup_rejects_duplicate_email()
    {
        var client = factory.CreateClient();
        var request = Recruit with { Email = "dup@example.com" };
        await client.PostAsJsonAsync("/api/auth/signup", request);

        var response = await client.PostAsJsonAsync("/api/auth/signup", request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Login_returns_token_and_me_returns_profile()
    {
        var client = factory.CreateClient();
        var request = Recruit with { Email = "login@example.com" };
        await client.PostAsJsonAsync("/api/auth/signup", request);

        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(request.Email, request.Password));
        login.EnsureSuccessStatusCode();
        var body = await login.Content.ReadFromJsonAsync<AuthResponse>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body!.Token);
        var me = await client.GetFromJsonAsync<UserResponse>("/api/auth/me");

        Assert.Equal("login@example.com", me!.Email);
    }

    [Fact]
    public async Task Login_locks_account_after_five_failures()
    {
        var client = factory.CreateClient();
        var request = Recruit with { Email = "lockout@example.com" };
        await client.PostAsJsonAsync("/api/auth/signup", request);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var failed = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(request.Email, "Wrong12345"));
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        var locked = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(request.Email, request.Password));

        Assert.Equal(HttpStatusCode.Locked, locked.StatusCode);
    }

    [Fact]
    public async Task Me_requires_authentication()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
