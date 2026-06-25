using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;

namespace OnboardingDiary.Tests.Users;

public class UsersControllerTests : IClassFixture<Integration.TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly Integration.TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public UsersControllerTests(Integration.TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(string AccessToken, Guid UserId)> RegisterAndLogin(string? email = null, string role = "Recruit")
    {
        email ??= $"user{Guid.NewGuid():N}@example.com";

        await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email,
            Password: "Str0ng!Pass1",
            Name: "Test User",
            Department: "Engineering",
            StartDate: DateTime.UtcNow));

        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();

        return (loginBody!.AccessToken, loginBody.User.Id);
    }

    private async Task<(string AccessToken, Guid UserId)> GetAdminToken()
    {
        var loginRes = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@onboardingdiary.com", "Admin@123"));
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>();

        return (loginBody!.AccessToken, loginBody.User.Id);
    }

    private HttpClient AuthenticatedClient(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task GetMe_Unauthenticated_Returns401()
    {
        var res = await _client.GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetMe_Authenticated_Returns200()
    {
        var (token, _) = await RegisterAndLogin();
        var client = AuthenticatedClient(token);

        var res = await client.GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Test User", json.GetProperty("user").GetProperty("name").GetString());
    }

    [Fact]
    public async Task PutMe_ValidUpdate_Returns200()
    {
        var (token, _) = await RegisterAndLogin();
        var client = AuthenticatedClient(token);

        var updateRes = await client.PutAsJsonAsync("/api/users/me", new
        {
            Name = "Updated Name",
            Department = "HR",
            StartDate = DateTime.UtcNow.Date,
            AvatarUrl = "https://example.com/avatar.png"
        });

        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);

        var json = await updateRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Updated Name", json.GetProperty("user").GetProperty("name").GetString());
        Assert.Equal("HR", json.GetProperty("user").GetProperty("department").GetString());
    }

    [Fact]
    public async Task PutMe_InvalidName_Returns400()
    {
        var (token, _) = await RegisterAndLogin();
        var client = AuthenticatedClient(token);

        var updateRes = await client.PutAsJsonAsync("/api/users/me", new
        {
            Name = "A",
            Department = "Engineering",
            StartDate = DateTime.UtcNow.Date,
            AvatarUrl = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, updateRes.StatusCode);
    }

    [Fact]
    public async Task ListUsers_NonAdmin_Returns403()
    {
        var (token, _) = await RegisterAndLogin();
        var client = AuthenticatedClient(token);

        var res = await client.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task ListUsers_Admin_Returns200Paginated()
    {
        var (adminToken, _) = await GetAdminToken();
        var client = AuthenticatedClient(adminToken);

        var res = await client.GetAsync("/api/users?page=1&limit=10");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("total").GetInt32() >= 1);
        Assert.True(json.GetProperty("users").GetArrayLength() >= 1);
    }

    [Fact]
    public async Task UpdateRole_Admin_Returns200AndWritesAuditLog()
    {
        var (adminToken, _) = await GetAdminToken();
        var adminClient = AuthenticatedClient(adminToken);

        var (_, recruitId) = await RegisterAndLogin();

        var roleRes = await adminClient.PutAsJsonAsync($"/api/users/{recruitId}/role", new { Role = "Manager" });
        Assert.Equal(HttpStatusCode.OK, roleRes.StatusCode);

        var json = await roleRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Manager", json.GetProperty("user").GetProperty("role").GetString());

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.AppDbContext>();
        var auditLog = context.AuditLogs
            .Where(a => a.EntityId == recruitId.ToString() && a.Action == "RoleChanged")
            .OrderByDescending(a => a.Timestamp)
            .FirstOrDefault();
        Assert.NotNull(auditLog);
    }

    [Fact]
    public async Task DeleteUser_Admin_SetsIsActiveFalse()
    {
        var (adminToken, _) = await GetAdminToken();
        var adminClient = AuthenticatedClient(adminToken);

        var (_, recruitId) = await RegisterAndLogin();

        var res = await adminClient.DeleteAsync($"/api/users/{recruitId}");
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<Infrastructure.Persistence.AppDbContext>();
        var user = await context.Users.FindAsync(recruitId);
        Assert.NotNull(user);
        Assert.False(user.IsActive);
    }

    [Fact]
    public async Task DeleteUser_SelfDeactivation_Returns400()
    {
        var (adminToken, adminId) = await GetAdminToken();
        var adminClient = AuthenticatedClient(adminToken);

        var res = await adminClient.DeleteAsync($"/api/users/{adminId}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("cannot deactivate yourself", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateRole_SelfDemotion_Returns400()
    {
        var (adminToken, adminId) = await GetAdminToken();
        var adminClient = AuthenticatedClient(adminToken);

        var roleRes = await adminClient.PutAsJsonAsync($"/api/users/{adminId}/role", new { Role = "Recruit" });
        Assert.Equal(HttpStatusCode.BadRequest, roleRes.StatusCode);

        var body = await roleRes.Content.ReadAsStringAsync();
        Assert.Contains("cannot remove Admin role from yourself", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UpdateRole_NonAdmin_Returns403()
    {
        var (token, _) = await RegisterAndLogin();
        var client = AuthenticatedClient(token);

        var res = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}/role", new { Role = "Manager" });
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }
}
