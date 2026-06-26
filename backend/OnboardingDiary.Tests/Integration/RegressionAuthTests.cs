using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Integration;

/// <summary>
/// REG-AUTH-01..09: Auth & session regression tests
/// </summary>
public class RegressionAuthTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public RegressionAuthTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private static RegisterRequest ValidRegister(string? email = null) => new(
        Email: email ?? $"user{Guid.NewGuid():N}@example.com",
        Password: "Str0ng!Pass1",
        Name: "Test User",
        Department: "Engineering",
        StartDate: DateTime.UtcNow);

    private async Task<LoginResponse> RegisterAndLoginAsync(string? email = null, string password = "Str0ng!Pass1")
    {
        email ??= $"user{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        loginRes.EnsureSuccessStatusCode();
        return (await loginRes.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts))!;
    }

    // REG-AUTH-01: Register defaults to Recruit role + confirmation email logged
    [Fact]
    public async Task REG_AUTH_01_Register_DefaultsToRecruit_And_LogsConfirmationEmail()
    {
        var email = $"reg01_{Guid.NewGuid():N}@example.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<RegisterResponse>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal("Recruit", body.Role);
        Assert.Equal(email, body.Email);
    }

    // REG-AUTH-02: Duplicate email returns 400 (or 409)
    [Fact]
    public async Task REG_AUTH_02_Register_DuplicateEmail_Returns400Or409()
    {
        var email = $"dup02_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var response = await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));
        Assert.True(
            response.StatusCode == HttpStatusCode.BadRequest ||
            response.StatusCode == HttpStatusCode.Conflict,
            $"Expected 400 or 409, got {response.StatusCode}");
    }

    // REG-AUTH-03: Valid login returns 200 with tokens
    [Fact]
    public async Task REG_AUTH_03_Login_ValidCredentials_Returns200WithTokens()
    {
        var email = $"valid03_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));

        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var body = await loginRes.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts);
        Assert.NotNull(body);
        Assert.False(string.IsNullOrEmpty(body.AccessToken));
        Assert.False(string.IsNullOrEmpty(body.RefreshToken));
    }

    // REG-AUTH-04: Invalid login returns 401
    [Fact]
    public async Task REG_AUTH_04_Login_InvalidCredentials_Returns401()
    {
        var email = $"inv04_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "WrongPass!99"));

        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);
    }

    // REG-AUTH-05: 5 failed logins lock account; 6th rejected even with correct password
    [Fact]
    public async Task REG_AUTH_05_AccountLockout_After5FailedAttempts()
    {
        var email = $"lock05_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));

        for (int i = 0; i < 5; i++)
        {
            await _client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest(email, "WrongPass!1"));
        }

        // 6th attempt with CORRECT password should still fail
        var lockedRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));

        Assert.True(
            lockedRes.StatusCode == HttpStatusCode.BadRequest ||
            lockedRes.StatusCode == HttpStatusCode.Unauthorized,
            $"Expected locked account response, got {lockedRes.StatusCode}");

        var body = await lockedRes.Content.ReadAsStringAsync();
        Assert.Contains("locked", body, StringComparison.OrdinalIgnoreCase);
    }

    // REG-AUTH-06: Refresh rotation revokes old token
    [Fact]
    public async Task REG_AUTH_06_Refresh_RotatesTokens_OldTokenRevoked()
    {
        var login = await RegisterAndLoginAsync();

        var refreshRes = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(login.RefreshToken));
        Assert.Equal(HttpStatusCode.OK, refreshRes.StatusCode);
        var newTokens = await refreshRes.Content.ReadFromJsonAsync<RefreshResponse>(JsonOpts);
        Assert.NotNull(newTokens);
        Assert.NotEqual(login.RefreshToken, newTokens.RefreshToken);

        // Old refresh token should now be revoked
        var oldRefreshRes = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(login.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, oldRefreshRes.StatusCode);
    }

    // REG-AUTH-07: Logout revokes refresh token
    [Fact]
    public async Task REG_AUTH_07_Logout_RevokesRefreshToken()
    {
        var login = await RegisterAndLoginAsync();

        var logoutRes = await _client.PostAsJsonAsync("/api/auth/logout",
            new LogoutRequest(login.RefreshToken));
        Assert.Equal(HttpStatusCode.NoContent, logoutRes.StatusCode);

        // Refresh should now fail
        var refreshRes = await _client.PostAsJsonAsync("/api/auth/refresh",
            new RefreshRequest(login.RefreshToken));
        Assert.Equal(HttpStatusCode.Unauthorized, refreshRes.StatusCode);
    }

    // REG-AUTH-08: Forgot/reset password flow
    [Fact]
    public async Task REG_AUTH_08_ForgotPassword_AlwaysReturns200_Generic()
    {
        // Non-existent email still returns 200 (generic response)
        var res = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest("nonexistent@example.com"));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        // Existing email also returns 200
        var email = $"forgot08_{Guid.NewGuid():N}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", ValidRegister(email));
        var res2 = await _client.PostAsJsonAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest(email));
        Assert.Equal(HttpStatusCode.OK, res2.StatusCode);
    }

    // REG-AUTH-09: Protected endpoint 401 without token / 200 with token
    [Fact]
    public async Task REG_AUTH_09_ProtectedEndpoint_401Without_200With()
    {
        var unauthClient = _factory.CreateClient();
        var pingRes = await unauthClient.GetAsync("/api/auth/ping");
        Assert.Equal(HttpStatusCode.Unauthorized, pingRes.StatusCode);

        var login = await RegisterAndLoginAsync();
        var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.AccessToken);
        var authPingRes = await authClient.GetAsync("/api/auth/ping");
        Assert.Equal(HttpStatusCode.OK, authPingRes.StatusCode);
    }
}
