using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Integration;

/// <summary>
/// REG-USER-01..07: Profile & admin user management regression tests
/// </summary>
public class RegressionUserTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public RegressionUserTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(HttpClient client, Guid userId)> CreateAuthenticatedClient(
        string? email = null, string role = "Recruit")
    {
        var client = _factory.CreateClient();
        email ??= $"user{Guid.NewGuid():N}@example.com";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email, Password: "Str0ng!Pass1", Name: "Test User",
            Department: "Engineering", StartDate: DateTime.UtcNow));
        regRes.EnsureSuccessStatusCode();
        var regBody = await regRes.Content.ReadFromJsonAsync<RegisterResponse>(JsonOpts);

        if (role != "Recruit")
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            if (role == "Manager") user.Role = Role.Manager;
            else if (role == "Admin") user.Role = Role.Admin;
            await db.SaveChangesAsync();
        }

        var loginRes = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, "Str0ng!Pass1"));
        loginRes.EnsureSuccessStatusCode();
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody!.AccessToken);

        return (client, regBody!.UserId);
    }

    private async Task<(HttpClient client, Guid userId)> GetAdminClient()
    {
        var client = _factory.CreateClient();
        var loginRes = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin@onboardingdiary.com", "Admin@123"));
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody!.AccessToken);

        return (client, loginBody.User.Id);
    }

    // REG-USER-01: GET /me returns user profile
    [Fact]
    public async Task REG_USER_01_GetMe_Returns200WithProfile()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.GetAsync("/api/users/me");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(json.TryGetProperty("user", out var user));
        Assert.False(string.IsNullOrEmpty(user.GetProperty("name").GetString()));
    }

    // REG-USER-02: PUT /me updates profile
    [Fact]
    public async Task REG_USER_02_PutMe_UpdatesProfile()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            Name = "Updated Name",
            Department = "HR",
            StartDate = DateTime.UtcNow.Date,
            AvatarUrl = "https://example.com/avatar.png"
        });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Updated Name", json.GetProperty("user").GetProperty("name").GetString());
    }

    // REG-USER-03: Profile validation - start date >30 days future, bad name, off-list department
    [Fact]
    public async Task REG_USER_03_PutMe_StartDateTooFarFuture_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            Name = "Valid Name",
            Department = "Engineering",
            StartDate = DateTime.UtcNow.AddDays(31).Date,
            AvatarUrl = (string?)null
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task REG_USER_03_PutMe_BadNamePattern_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            Name = "A", // too short
            Department = "Engineering",
            StartDate = DateTime.UtcNow.Date,
            AvatarUrl = (string?)null
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task REG_USER_03_PutMe_OffListDepartment_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            Name = "Valid Name",
            Department = "InvalidDepartment",
            StartDate = DateTime.UtcNow.Date,
            AvatarUrl = (string?)null
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // REG-USER-04: List users 403 for non-admin / 200 paginated for admin
    [Fact]
    public async Task REG_USER_04_ListUsers_NonAdmin_Returns403()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task REG_USER_04_ListUsers_Admin_Returns200Paginated()
    {
        var (adminClient, _) = await GetAdminClient();
        var res = await adminClient.GetAsync("/api/users?page=1&limit=10");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(json.GetProperty("total").GetInt32() >= 1);
        Assert.True(json.GetProperty("users").GetArrayLength() >= 1);
        Assert.True(json.TryGetProperty("totalPages", out _));
    }

    // REG-USER-05: Role change writes AuditLog + logs email
    [Fact]
    public async Task REG_USER_05_RoleChange_WritesAuditLog()
    {
        var (adminClient, _) = await GetAdminClient();
        var (_, recruitId) = await CreateAuthenticatedClient();

        var roleRes = await adminClient.PutAsJsonAsync($"/api/users/{recruitId}/role", new { Role = "Manager" });
        Assert.Equal(HttpStatusCode.OK, roleRes.StatusCode);

        var json = await roleRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Manager", json.GetProperty("user").GetProperty("role").GetString());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var auditLog = db.AuditLogs
            .Where(a => a.EntityId == recruitId.ToString() && a.Action == "RoleChanged")
            .OrderByDescending(a => a.Timestamp)
            .FirstOrDefault();
        Assert.NotNull(auditLog);
    }

    // REG-USER-06: Deactivate sets IsActive=false + revokes tokens + writes audit
    [Fact]
    public async Task REG_USER_06_DeactivateUser_SetsIsActiveFalse_WritesAudit()
    {
        var (adminClient, _) = await GetAdminClient();
        var (_, recruitId) = await CreateAuthenticatedClient();

        var res = await adminClient.DeleteAsync($"/api/users/{recruitId}");
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FindAsync(recruitId);
        Assert.NotNull(user);
        Assert.False(user.IsActive);

        var auditLog = db.AuditLogs
            .Where(a => a.EntityId == recruitId.ToString() &&
                       (a.Action == "Deactivated" || a.Action == "UserDeactivated"))
            .FirstOrDefault();
        Assert.NotNull(auditLog);
    }

    // REG-USER-07: Admin self-deactivate/self-de-admin returns 400
    [Fact]
    public async Task REG_USER_07_AdminSelfDeactivate_Returns400()
    {
        var (adminClient, adminId) = await GetAdminClient();
        var res = await adminClient.DeleteAsync($"/api/users/{adminId}");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task REG_USER_07_AdminSelfDemote_Returns400()
    {
        var (adminClient, adminId) = await GetAdminClient();
        var roleRes = await adminClient.PutAsJsonAsync($"/api/users/{adminId}/role", new { Role = "Recruit" });
        Assert.Equal(HttpStatusCode.BadRequest, roleRes.StatusCode);
    }
}
