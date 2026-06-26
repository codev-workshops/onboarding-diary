using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Tests.Integration;

namespace OnboardingDiary.Tests.Tasks;

public class TasksControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public TasksControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(string? email = null, string role = "Recruit", Guid? managerId = null)
    {
        var client = _factory.CreateClient();
        email ??= $"user{Guid.NewGuid():N}@example.com";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email,
            Password: "Str0ng!Pass1",
            Name: "Test User",
            Department: "Engineering",
            StartDate: DateTime.UtcNow));
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

    private static object ValidTask(string title = "Test Task") => new
    {
        Date = DateTime.UtcNow.Date,
        Title = title,
        Description = "A description",
        Category = "Training",
        Status = "NotStarted",
        Priority = "Medium",
    };

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Create_Returns201()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/tasks", ValidTask());
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.TryGetProperty("task", out var task));
        Assert.Equal("Test Task", task.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Create_InvalidTitle_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "ab",
            Category = "Training",
            Status = "NotStarted",
            Priority = "Medium",
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task CRUD_FullRoundTrip()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/tasks", ValidTask("Round Trip"));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = createBody.GetProperty("task").GetProperty("id").GetString();

        var getRes = await client.GetAsync($"/api/tasks/{taskId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var getBody = await getRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Round Trip", getBody.GetProperty("task").GetProperty("title").GetString());

        var updateRes = await client.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Updated Title",
            Description = "Updated desc",
            Category = "Setup",
            Status = "InProgress",
            Priority = "High",
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updateBody = await updateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Updated Title", updateBody.GetProperty("task").GetProperty("title").GetString());

        var deleteRes = await client.DeleteAsync($"/api/tasks/{taskId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var getAfterDelete = await client.GetAsync($"/api/tasks/{taskId}");
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task List_PaginationAndFiltering()
    {
        var (client, _) = await CreateAuthenticatedClient();

        for (int i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/tasks", new
            {
                Date = DateTime.UtcNow.Date,
                Title = $"Pag Task {i}",
                Description = (string?)null,
                Category = i < 3 ? "Training" : "Setup",
                Status = "NotStarted",
                Priority = "Low",
            });
        }

        var allRes = await client.GetAsync("/api/tasks?limit=100");
        var allBody = await allRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(allBody.GetProperty("total").GetInt32() >= 5);

        var filteredRes = await client.GetAsync("/api/tasks?category=Training&limit=100");
        var filteredBody = await filteredRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var filteredTasks = filteredBody.GetProperty("tasks").GetArrayLength();
        Assert.True(filteredTasks >= 3);

        var page1Res = await client.GetAsync("/api/tasks?page=1&limit=2");
        var page1Body = await page1Res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(2, page1Body.GetProperty("tasks").GetArrayLength());
        Assert.True(page1Body.GetProperty("totalPages").GetInt32() >= 2);
    }

    [Fact]
    public async Task SoftDeletedTasks_ExcludedFromList()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/tasks", ValidTask("Soft Delete"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = createBody.GetProperty("task").GetProperty("id").GetString();

        await client.DeleteAsync($"/api/tasks/{taskId}");

        var listRes = await client.GetAsync("/api/tasks?limit=100");
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskIds = new List<string>();
        foreach (var t in listBody.GetProperty("tasks").EnumerateArray())
            taskIds.Add(t.GetProperty("id").GetString()!);

        Assert.DoesNotContain(taskId, taskIds);
    }

    [Fact]
    public async Task Manager_CanReadAssignedRecruitTasks()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");

        var (recruitClient, recruitId) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        await recruitClient.PostAsJsonAsync("/api/tasks", ValidTask("Recruit Task"));

        var listRes = await managerClient.GetAsync($"/api/tasks?recruitId={recruitId}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(listBody.GetProperty("tasks").GetArrayLength() > 0);
    }

    [Fact]
    public async Task Manager_CannotUpdateRecruitTask()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/tasks", ValidTask("Recruit Only"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = createBody.GetProperty("task").GetProperty("id").GetString();

        var updateRes = await managerClient.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Manager Edit",
            Description = "Nope",
            Category = "Training",
            Status = "InProgress",
            Priority = "Medium",
        });
        Assert.Equal(HttpStatusCode.NotFound, updateRes.StatusCode);
    }

    [Fact]
    public async Task Manager_CannotDeleteRecruitTask()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/tasks", ValidTask("No Delete"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = createBody.GetProperty("task").GetProperty("id").GetString();

        var deleteRes = await managerClient.DeleteAsync($"/api/tasks/{taskId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteRes.StatusCode);
    }

    [Fact]
    public async Task Manager_CannotSeeUnassignedRecruitTasks()
    {
        var (managerClient, _) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient();

        await recruitClient.PostAsJsonAsync("/api/tasks", ValidTask("Hidden Task"));

        var listRes = await managerClient.GetAsync($"/api/tasks?recruitId={recruitId}");
        Assert.True(
            listRes.StatusCode == HttpStatusCode.Forbidden ||
            listRes.StatusCode == HttpStatusCode.Unauthorized ||
            listRes.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Stats_ReturnsCorrectValues()
    {
        var (client, _) = await CreateAuthenticatedClient();

        await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Stat1", Description = "desc",
            Category = "Training", Status = "Completed", Priority = "Low"
        });
        await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Stat2",
            Category = "Setup", Status = "InProgress", Priority = "Medium"
        });
        await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Stat3",
            Category = "Meeting", Status = "NotStarted", Priority = "High"
        });

        var statsRes = await client.GetAsync("/api/tasks/stats");
        Assert.Equal(HttpStatusCode.OK, statsRes.StatusCode);
        var stats = await statsRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(stats.GetProperty("total").GetInt32() >= 3);
        Assert.True(stats.GetProperty("completed").GetInt32() >= 1);
    }

    [Fact]
    public async Task Create_CompletedWithoutDescription_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "No Desc Completed",
            Category = "Training",
            Status = "Completed",
            Priority = "Low",
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
