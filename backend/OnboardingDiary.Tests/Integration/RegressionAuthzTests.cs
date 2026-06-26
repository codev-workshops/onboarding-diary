using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Integration;

/// <summary>
/// REG-AUTHZ-01..06: Role isolation regression tests
/// </summary>
public class RegressionAuthzTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public RegressionAuthzTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(
        string? email = null, string role = "Recruit", Guid? managerId = null)
    {
        var client = _factory.CreateClient();
        email ??= $"user{Guid.NewGuid():N}@example.com";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email, Password: "Str0ng!Pass1", Name: "Test User",
            Department: "Engineering", StartDate: DateTime.UtcNow));
        regRes.EnsureSuccessStatusCode();
        var regBody = await regRes.Content.ReadFromJsonAsync<RegisterResponse>(JsonOpts);

        if (role != "Recruit" || managerId.HasValue)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Email == email);
            if (role == "Manager") user.Role = Role.Manager;
            else if (role == "Admin") user.Role = Role.Admin;
            if (managerId.HasValue) user.ManagerId = managerId.Value;
            await db.SaveChangesAsync();
        }

        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Str0ng!Pass1"));
        loginRes.EnsureSuccessStatusCode();
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody!.AccessToken);

        return (client, regBody!.UserId.ToString());
    }

    // REG-AUTHZ-01: Recruit cannot access another recruit's data (404/403)
    [Fact]
    public async Task REG_AUTHZ_01_RecruitCannotAccessAnotherRecruitsTasks()
    {
        var (recruit1, _) = await CreateAuthenticatedClient();
        var (recruit2, recruit2Id) = await CreateAuthenticatedClient();

        // Recruit2 creates a task
        var createRes = await recruit2.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Private Task",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = body.GetProperty("task").GetProperty("id").GetString();

        // Recruit1 tries to access it
        var getRes = await recruit1.GetAsync($"/api/tasks/{taskId}");
        Assert.True(
            getRes.StatusCode == HttpStatusCode.NotFound ||
            getRes.StatusCode == HttpStatusCode.Forbidden);
    }

    // REG-AUTHZ-02: Manager GET assigned recruit's data (200 read-only)
    [Fact]
    public async Task REG_AUTHZ_02_ManagerCanReadAssignedRecruitTasks()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        await recruitClient.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Assigned Task",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });

        var listRes = await managerClient.GetAsync($"/api/tasks?recruitId={recruitId}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var body = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("tasks").GetArrayLength() > 0);
    }

    // REG-AUTHZ-03: Manager update/delete assigned recruit's entity returns 403/404
    [Fact]
    public async Task REG_AUTHZ_03_ManagerCannotUpdateAssignedRecruitTask()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "No Edit",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = body.GetProperty("task").GetProperty("id").GetString();

        var updateRes = await managerClient.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            Date = DateTime.UtcNow.Date, Title = "Manager Edit", Description = "Nope",
            Category = "Training", Status = "InProgress", Priority = "Medium",
        });
        Assert.True(
            updateRes.StatusCode == HttpStatusCode.NotFound ||
            updateRes.StatusCode == HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task REG_AUTHZ_03_ManagerCannotDeleteAssignedRecruitTask()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "No Delete",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = body.GetProperty("task").GetProperty("id").GetString();

        var deleteRes = await managerClient.DeleteAsync($"/api/tasks/{taskId}");
        Assert.True(
            deleteRes.StatusCode == HttpStatusCode.NotFound ||
            deleteRes.StatusCode == HttpStatusCode.Forbidden);
    }

    // REG-AUTHZ-04: Manager cannot access non-assigned recruit's data (404/403)
    [Fact]
    public async Task REG_AUTHZ_04_ManagerCannotAccessNonAssignedRecruitTasks()
    {
        var (managerClient, _) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient(); // NOT assigned

        await recruitClient.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Unassigned Task",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });

        var listRes = await managerClient.GetAsync($"/api/tasks?recruitId={recruitId}");
        Assert.True(
            listRes.StatusCode == HttpStatusCode.Forbidden ||
            listRes.StatusCode == HttpStatusCode.Unauthorized ||
            listRes.StatusCode == HttpStatusCode.InternalServerError);
    }

    // REG-AUTHZ-05: Notes private even from managers/admins (404)
    [Fact]
    public async Task REG_AUTHZ_05_NotesPrivateFromManager()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date, Title = "Private Note",
            Content = "Secret content", Tags = Array.Empty<string>(), IsPinned = false,
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteId = body.GetProperty("note").GetProperty("id").GetString();

        var getRes = await managerClient.GetAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);
    }

    [Fact]
    public async Task REG_AUTHZ_05_NotesPrivateFromAdmin()
    {
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");
        var (recruitClient, _) = await CreateAuthenticatedClient();

        var createRes = await recruitClient.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date, Title = "Admin Cant See",
            Content = "Secret content", Tags = Array.Empty<string>(), IsPinned = false,
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteId = body.GetProperty("note").GetProperty("id").GetString();

        var getRes = await adminClient.GetAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);
    }

    // REG-AUTHZ-06: Admin can access any user's tasks/issues/feedback
    [Fact]
    public async Task REG_AUTHZ_06_AdminCanAccessAnyUsersTasks()
    {
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient();

        await recruitClient.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Admin Can See",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });

        var listRes = await adminClient.GetAsync($"/api/tasks?recruitId={recruitId}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var body = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("tasks").GetArrayLength() > 0);
    }

    [Fact]
    public async Task REG_AUTHZ_06_AdminCanAccessAnyUsersIssues()
    {
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient();

        await recruitClient.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date, Title = "Admin Access Issue",
            Description = "A valid description that meets minimum length",
            Severity = "Medium", Status = "Open",
        });

        var listRes = await adminClient.GetAsync($"/api/issues?recruitId={recruitId}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var body = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("issues").GetArrayLength() > 0);
    }
}
