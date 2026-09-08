using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Dashboard;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.IntegrationTests;

public class TaskEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private static CreateTaskRequest NewTask(string title = "Set up laptop") =>
        new(
            Today,
            title,
            "Install the toolchain",
            TaskCategory.Setup,
            TaskEntryStatus.Todo,
            TaskPriority.Medium
        );

    private async Task<(HttpClient Client, int UserId)> RecruitAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/signup",
            new SignupRequest(email, "correct-horse-9", "Ada Lovelace", null, Today.AddDays(-10))
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            auth.AccessToken
        );

        return (client, auth.User.Id);
    }

    /// <summary>Promotes a signed-up account so role-scoped behaviour can be exercised.</summary>
    private async Task<HttpClient> PromotedAsync(string email, UserRole role, int? recruitId = null)
    {
        var (_, userId) = await RecruitAsync(email);

        await factory.WithDbAsync(async db =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            user.Role = role;

            if (recruitId is { } assigned)
            {
                var recruit = await db.Users.FirstAsync(u => u.Id == assigned);
                recruit.ManagerId = userId;
            }

            return await db.SaveChangesAsync();
        });

        var client = factory.CreateClient();
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, "correct-horse-9")
        );
        var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            auth.AccessToken
        );

        return client;
    }

    private static async Task<TaskResponse> CreateAsync(HttpClient client, CreateTaskRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/v1/tasks", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions.Api))!;
    }

    [Fact]
    public async Task Recruit_can_create_read_update_and_delete_a_task()
    {
        var (client, userId) = await RecruitAsync("tasks-crud@example.com");

        var created = await CreateAsync(client, NewTask());
        Assert.Equal(userId, created.UserId);
        Assert.Equal(TaskEntryStatus.Todo, created.Status);

        var updated = await client.PatchAsJsonAsync(
            $"/api/v1/tasks/{created.Id}",
            new UpdateTaskRequest(
                Today,
                "Set up laptop and IDE",
                null,
                TaskCategory.Setup,
                TaskEntryStatus.Done,
                TaskPriority.High
            )
        );
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var task = (await updated.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions.Api))!;
        Assert.Equal(TaskEntryStatus.Done, task.Status);
        Assert.Equal("Set up laptop and IDE", task.Title);

        var deleted = await client.DeleteAsync($"/api/v1/tasks/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var gone = await client.GetAsync($"/api/v1/tasks/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, gone.StatusCode);
    }

    [Fact]
    public async Task Create_rejects_a_short_title_and_a_future_date()
    {
        var (client, _) = await RecruitAsync("tasks-validation@example.com");

        var shortTitle = await client.PostAsJsonAsync("/api/v1/tasks", NewTask("no"));
        Assert.Equal(HttpStatusCode.BadRequest, shortTitle.StatusCode);
        var problem = await shortTitle.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains("Title", problem!.Errors.Keys);

        var future = await client.PostAsJsonAsync(
            "/api/v1/tasks",
            NewTask() with
            {
                EntryDate = Today.AddDays(1),
            }
        );
        Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
    }

    [Fact]
    public async Task List_applies_filters_search_and_paging()
    {
        var (client, _) = await RecruitAsync("tasks-filters@example.com");

        await CreateAsync(client, NewTask("Read the handbook") with { EntryDate = Today.AddDays(-3) });
        await CreateAsync(
            client,
            NewTask("Pair on the API") with
            {
                Category = TaskCategory.Coding,
                Status = TaskEntryStatus.Done,
                EntryDate = Today.AddDays(-1),
            }
        );
        await CreateAsync(client, NewTask("Team standup") with { Category = TaskCategory.Meeting });

        var byStatus = await client.GetFromJsonAsync<PagedResponse<TaskResponse>>(
            "/api/v1/tasks?status=Done",
            JsonOptions.Api
        );
        Assert.Equal(1, byStatus!.Total);
        Assert.Equal("Pair on the API", byStatus.Items[0].Title);

        var byCategory = await client.GetFromJsonAsync<PagedResponse<TaskResponse>>(
            "/api/v1/tasks?category=Meeting",
            JsonOptions.Api
        );
        Assert.Equal(1, byCategory!.Total);

        var byRange = await client.GetFromJsonAsync<PagedResponse<TaskResponse>>(
            $"/api/v1/tasks?from={Today.AddDays(-2):yyyy-MM-dd}",
            JsonOptions.Api
        );
        Assert.Equal(2, byRange!.Total);

        var bySearch = await client.GetFromJsonAsync<PagedResponse<TaskResponse>>(
            "/api/v1/tasks?q=handbook",
            JsonOptions.Api
        );
        Assert.Equal(1, bySearch!.Total);

        var paged = await client.GetFromJsonAsync<PagedResponse<TaskResponse>>(
            "/api/v1/tasks?page=2&pageSize=2",
            JsonOptions.Api
        );
        Assert.Equal(3, paged!.Total);
        Assert.Single(paged.Items);
        Assert.Equal("Read the handbook", paged.Items[0].Title);
    }

    [Fact]
    public async Task A_recruit_cannot_see_or_change_another_recruits_task()
    {
        var (owner, ownerId) = await RecruitAsync("tasks-owner@example.com");
        var (other, _) = await RecruitAsync("tasks-other@example.com");
        var task = await CreateAsync(owner, NewTask());

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/v1/tasks/{task.Id}")).StatusCode);

        var patch = await other.PatchAsJsonAsync(
            $"/api/v1/tasks/{task.Id}",
            new UpdateTaskRequest(
                Today,
                "Hijacked",
                null,
                TaskCategory.Other,
                TaskEntryStatus.Done,
                TaskPriority.Low
            )
        );
        Assert.Equal(HttpStatusCode.NotFound, patch.StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await other.DeleteAsync($"/api/v1/tasks/{task.Id}")).StatusCode
        );

        var listed = await other.GetAsync($"/api/v1/tasks?userId={ownerId}");
        Assert.Equal(HttpStatusCode.NotFound, listed.StatusCode);
    }

    [Fact]
    public async Task An_assigned_manager_reads_but_cannot_write_recruit_tasks()
    {
        var (recruit, recruitId) = await RecruitAsync("tasks-managed@example.com");
        var task = await CreateAsync(recruit, NewTask());
        var manager = await PromotedAsync("tasks-manager@example.com", UserRole.Manager, recruitId);

        var listed = await manager.GetFromJsonAsync<PagedResponse<TaskResponse>>(
            $"/api/v1/tasks?userId={recruitId}",
            JsonOptions.Api
        );
        Assert.Equal(1, listed!.Total);

        var single = await manager.GetAsync($"/api/v1/tasks/{task.Id}");
        Assert.Equal(HttpStatusCode.OK, single.StatusCode);

        var write = await manager.PostAsJsonAsync("/api/v1/tasks", NewTask());
        Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);

        var delete = await manager.DeleteAsync($"/api/v1/tasks/{task.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, delete.StatusCode);
    }

    [Fact]
    public async Task A_manager_cannot_read_an_unassigned_recruits_tasks()
    {
        var (recruit, recruitId) = await RecruitAsync("tasks-unassigned@example.com");
        var task = await CreateAsync(recruit, NewTask());
        var manager = await PromotedAsync("tasks-other-manager@example.com", UserRole.Manager);

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await manager.GetAsync($"/api/v1/tasks?userId={recruitId}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await manager.GetAsync($"/api/v1/tasks/{task.Id}")).StatusCode
        );
    }

    [Fact]
    public async Task Tasks_require_authentication()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/tasks");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Dashboard_summarises_the_recruits_task_completion()
    {
        var (client, _) = await RecruitAsync("dashboard@example.com");

        await CreateAsync(client, NewTask("First"));
        await CreateAsync(client, NewTask("Second"));
        await CreateAsync(client, NewTask("Third") with { Status = TaskEntryStatus.Done });
        await CreateAsync(client, NewTask("Fourth") with { Status = TaskEntryStatus.Done });

        var dashboard = await client.GetFromJsonAsync<DashboardResponse>(
            "/api/v1/dashboard",
            JsonOptions.Api
        );

        Assert.Equal(4, dashboard!.Tasks.Total);
        Assert.Equal(2, dashboard.Tasks.Done);
        Assert.Equal(2, dashboard.Tasks.Open);
        Assert.Equal(50, dashboard.Tasks.CompletionPercentage);
        Assert.Equal(4, dashboard.RecentTasks.Count);
    }

    [Fact]
    public async Task Dashboard_is_scoped_to_the_assigned_recruit_for_a_manager()
    {
        var (recruit, recruitId) = await RecruitAsync("dashboard-recruit@example.com");
        await CreateAsync(recruit, NewTask() with { Status = TaskEntryStatus.Done });
        var manager = await PromotedAsync(
            "dashboard-manager@example.com",
            UserRole.Manager,
            recruitId
        );

        var dashboard = await manager.GetFromJsonAsync<DashboardResponse>(
            $"/api/v1/dashboard?userId={recruitId}",
            JsonOptions.Api
        );
        Assert.Equal(100, dashboard!.Tasks.CompletionPercentage);

        var ownDashboard = await manager.GetAsync("/api/v1/dashboard");
        Assert.Equal(HttpStatusCode.NotFound, ownDashboard.StatusCode);
    }
}
