using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnboardingDiary.Application.Auth.Dtos;

namespace OnboardingDiary.Tests.Integration;

public class AuthControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthControllerTests(TestWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private static RegisterRequest ValidRegister(string? email = null) => new(
        Email: email ?? $"user{Guid.NewGuid():N}@example.com",
        Password: "Str0ng!Pass1",
        Name: "Test User",
        Department: "Engineering",
        StartDate: DateTime.UtcNow);

    [Fact]
    public async Task Register_Returns201AndRecruitRole()
    {
        var request = ValidRegister();
        var response = await _client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<RegisterResponse>();
        Assert.NotNull(body);
        Assert.Equal(request.Email, body.Email);
        Assert.Equal("Recruit", body.Role);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns400()
    {
        var email = $"dup{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var response = await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens()
    {
        var email = $"login{Guid.NewGuid():N}@example.com";
        var password = "Str0ng!Pass1";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, password));

        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var body = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrEmpty(body.AccessToken));
        Assert.False(string.IsNullOrEmpty(body.RefreshToken));
        Assert.Equal(email, body.User.Email);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns401()
    {
        var email = $"bad{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "WrongPass!1"));

        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);
    }

    [Fact]
    public async Task Login_FiveFailedAttempts_LocksAccount()
    {
        var email = $"lock{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        for (int i = 0; i < 5; i++)
        {
            await _client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest(email, "WrongPass!1"));
        }

        var lockedRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "WrongPass!1"));

        Assert.Equal(HttpStatusCode.BadRequest, lockedRes.StatusCode);
        var body = await lockedRes.Content.ReadAsStringAsync();
        Assert.Contains("locked", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Refresh_RotatesTokens()
    {
        var email = $"refresh{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();

        var refreshRes = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(loginBody!.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, refreshRes.StatusCode);

        var refreshBody = await refreshRes.Content.ReadFromJsonAsync<RefreshResponse>();
        Assert.NotNull(refreshBody);
        Assert.False(string.IsNullOrEmpty(refreshBody.AccessToken));
        Assert.False(string.IsNullOrEmpty(refreshBody.RefreshToken));
        Assert.NotEqual(loginBody.RefreshToken, refreshBody.RefreshToken);
    }

    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var email = $"logout{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();

        var logoutRes = await _client.PostAsJsonAsync("/api/auth/logout",
            new LogoutRequest(loginBody!.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logoutRes.StatusCode);

        var refreshRes = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(loginBody.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refreshRes.StatusCode);
    }

    [Fact]
    public async Task Ping_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/auth/ping");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Ping_WithValidToken_Returns200()
    {
        var email = $"ping{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody!.AccessToken);

        var pingRes = await _client.GetAsync("/api/auth/ping");
        Assert.Equal(HttpStatusCode.OK, pingRes.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_AlwaysReturns200()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest("nonexistent@example.com"));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
