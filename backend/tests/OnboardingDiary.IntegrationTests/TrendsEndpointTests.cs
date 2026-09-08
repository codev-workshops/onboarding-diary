using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Dashboard;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.IntegrationTests;

public class TrendsEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private const string Password = "correct-horse-9";

    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

    private async Task<(HttpClient Client, int UserId)> RecruitAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/signup",
            new SignupRequest(email, Password, $"Recruit {email}", null, Today.AddDays(-10))
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var auth = (await response.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        return (Authorized(client, auth.AccessToken), auth.User.Id);
    }

    private async Task<(HttpClient Client, int UserId)> PromotedAsync(string email, UserRole role)
    {
        var (_, userId) = await RecruitAsync(email);

        await factory.WithDbAsync(async db =>
        {
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            user.Role = role;
            return await db.SaveChangesAsync();
        });

        var client = factory.CreateClient();
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, Password)
        );
        var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        return (Authorized(client, auth.AccessToken), userId);
    }

    private static HttpClient Authorized(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private Task AssignAsync(int recruitId, int managerId) =>
        factory.WithDbAsync(async db =>
        {
            var recruit = await db.Users.FirstAsync(u => u.Id == recruitId);
            recruit.ManagerId = managerId;
            return await db.SaveChangesAsync();
        });

    private static async Task<TaskResponse> CreateTaskAsync(
        HttpClient recruit,
        DateOnly entryDate,
        TaskEntryStatus status,
        string title = "Read the handbook"
    )
    {
        var response = await recruit.PostAsJsonAsync(
            "/api/v1/tasks",
            new CreateTaskRequest(
                entryDate,
                title,
                "Worked through the onboarding handbook.",
                TaskCategory.Training,
                status,
                TaskPriority.Medium
            )
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions.Api))!;
    }

    private static async Task<TaskResponse> UpdateTaskAsync(
        HttpClient recruit,
        TaskResponse task,
        TaskEntryStatus status,
        string? title = null
    )
    {
        var response = await recruit.PatchAsJsonAsync(
            $"/api/v1/tasks/{task.Id}",
            new UpdateTaskRequest(
                task.EntryDate,
                title ?? task.Title,
                task.Description,
                task.Category,
                status,
                task.Priority
            )
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TaskResponse>(JsonOptions.Api))!;
    }

    private static async Task<TrendsResponse> TrendsAsync(HttpClient client, string query = "")
    {
        var response = await client.GetAsync($"/api/v1/dashboard/trends{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TrendsResponse>(JsonOptions.Api))!;
    }

    [Fact]
    public async Task Default_range_is_the_last_thirty_days_and_is_zero_filled()
    {
        var (recruit, _) = await RecruitAsync("trends-default@example.com");

        var trends = await TrendsAsync(recruit);

        Assert.Equal(30, trends.Days.Count);
        Assert.Equal(Today.AddDays(-29), trends.From);
        Assert.Equal(Today, trends.To);
        Assert.Equal(Today.AddDays(-29), trends.Days[0].Date);
        Assert.Equal(Today, trends.Days[^1].Date);
        Assert.All(
            trends.Days,
            day =>
                Assert.Equal(
                    0,
                    day.TasksLogged
                        + day.TasksCompleted
                        + day.IssuesOpened
                        + day.IssuesResolved
                        + day.FeedbackCount
                        + day.NoteCount
                )
        );
    }

    [Fact]
    public async Task Diary_entries_are_bucketed_by_their_entry_date()
    {
        var (recruit, _) = await RecruitAsync("trends-diary@example.com");
        var logged = Today.AddDays(-3);

        await CreateTaskAsync(recruit, logged, TaskEntryStatus.Todo, "First task");
        await CreateTaskAsync(recruit, logged, TaskEntryStatus.InProgress, "Second task");
        await recruit.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(
                logged,
                "VPN will not connect",
                "The client times out.",
                IssueSeverity.High
            )
        );
        await recruit.PostAsJsonAsync(
            "/api/v1/feedback",
            new CreateFeedbackRequest(
                logged,
                "Great buddy system",
                "My buddy answered everything.",
                FeedbackType.Positive
            )
        );
        await recruit.PostAsJsonAsync(
            "/api/v1/notes",
            new CreateNoteRequest(logged, "Standup times", "Standup is at 09:30.", null)
        );

        var trends = await TrendsAsync(recruit);
        var day = trends.Days.Single(d => d.Date == logged);

        Assert.Equal(2, day.TasksLogged);
        Assert.Equal(1, day.IssuesOpened);
        Assert.Equal(1, day.FeedbackCount);
        Assert.Equal(1, day.NoteCount);
        Assert.Equal(0, day.TasksCompleted);
        Assert.Equal(0, day.IssuesResolved);
    }

    [Fact]
    public async Task Completion_and_resolution_are_bucketed_by_their_lifecycle_timestamp()
    {
        var (recruit, _) = await RecruitAsync("trends-lifecycle@example.com");
        var logged = Today.AddDays(-5);

        var task = await CreateTaskAsync(recruit, logged, TaskEntryStatus.Todo);
        await UpdateTaskAsync(recruit, task, TaskEntryStatus.Done);

        var created = await recruit.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(
                logged,
                "Laptop is slow",
                "Builds take forever.",
                IssueSeverity.Medium
            )
        );
        var issue = (await created.Content.ReadFromJsonAsync<IssueResponse>(JsonOptions.Api))!;
        await recruit.PatchAsJsonAsync(
            $"/api/v1/issues/{issue.Id}",
            new UpdateIssueRequest(
                issue.EntryDate,
                issue.Title,
                issue.Description,
                issue.Severity,
                IssueStatus.Resolved,
                "IT swapped the machine."
            )
        );

        var trends = await TrendsAsync(recruit);
        var loggedDay = trends.Days.Single(d => d.Date == logged);
        var today = trends.Days.Single(d => d.Date == Today);

        Assert.Equal(1, loggedDay.TasksLogged);
        Assert.Equal(1, loggedDay.IssuesOpened);
        Assert.Equal(0, loggedDay.TasksCompleted);
        Assert.Equal(0, loggedDay.IssuesResolved);
        Assert.Equal(1, today.TasksCompleted);
        Assert.Equal(1, today.IssuesResolved);
        Assert.Equal(0, today.TasksLogged);
    }

    [Fact]
    public async Task Completion_timestamp_follows_the_status_transitions()
    {
        var (recruit, _) = await RecruitAsync("trends-transitions@example.com");

        var task = await CreateTaskAsync(recruit, Today, TaskEntryStatus.Todo);
        Assert.Null(task.CompletedAt);

        var done = await UpdateTaskAsync(recruit, task, TaskEntryStatus.Done);
        Assert.NotNull(done.CompletedAt);

        var edited = await UpdateTaskAsync(
            recruit,
            done,
            TaskEntryStatus.Done,
            "Renamed while done"
        );
        Assert.Equal(done.CompletedAt, edited.CompletedAt);

        var reopened = await UpdateTaskAsync(recruit, edited, TaskEntryStatus.InProgress);
        Assert.Null(reopened.CompletedAt);

        var completedAgain = await UpdateTaskAsync(recruit, reopened, TaskEntryStatus.Done);
        Assert.NotNull(completedAgain.CompletedAt);

        var trends = await TrendsAsync(recruit);
        Assert.Equal(1, trends.Days.Single(d => d.Date == Today).TasksCompleted);
    }

    [Fact]
    public async Task Task_created_as_done_counts_on_the_day_it_was_created()
    {
        var (recruit, _) = await RecruitAsync("trends-created-done@example.com");

        var task = await CreateTaskAsync(recruit, Today.AddDays(-2), TaskEntryStatus.Done);
        Assert.NotNull(task.CompletedAt);

        var trends = await TrendsAsync(recruit);

        Assert.Equal(1, trends.Days.Single(d => d.Date == Today.AddDays(-2)).TasksLogged);
        Assert.Equal(1, trends.Days.Single(d => d.Date == Today).TasksCompleted);
    }

    [Fact]
    public async Task Assigned_manager_can_read_a_recruit_s_trends()
    {
        var (recruit, recruitId) = await RecruitAsync("trends-assigned-recruit@example.com");
        var (manager, managerId) = await PromotedAsync(
            "trends-assigned-manager@example.com",
            UserRole.Manager
        );
        await AssignAsync(recruitId, managerId);
        await CreateTaskAsync(recruit, Today, TaskEntryStatus.Todo);

        var trends = await TrendsAsync(manager, $"?userId={recruitId}");

        Assert.Equal(recruitId, trends.UserId);
        Assert.Equal(1, trends.Days.Single(d => d.Date == Today).TasksLogged);
    }

    [Fact]
    public async Task Unassigned_manager_gets_not_found()
    {
        var (_, recruitId) = await RecruitAsync("trends-unassigned-recruit@example.com");
        var (manager, _) = await PromotedAsync(
            "trends-unassigned-manager@example.com",
            UserRole.Manager
        );

        var response = await manager.GetAsync($"/api/v1/dashboard/trends?userId={recruitId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Recruit_cannot_read_another_recruit_s_trends()
    {
        var (_, otherId) = await RecruitAsync("trends-other-recruit@example.com");
        var (recruit, _) = await RecruitAsync("trends-nosy-recruit@example.com");

        var response = await recruit.GetAsync($"/api/v1/dashboard/trends?userId={otherId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_is_unauthorized()
    {
        var response = await factory.CreateClient().GetAsync("/api/v1/dashboard/trends");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Range_of_exactly_366_days_is_accepted()
    {
        var (recruit, _) = await RecruitAsync("trends-366@example.com");
        var from = Today.AddDays(-365);

        var trends = await TrendsAsync(recruit, $"?from={from:yyyy-MM-dd}&to={Today:yyyy-MM-dd}");

        Assert.Equal(366, trends.Days.Count);
    }

    [Fact]
    public async Task Range_longer_than_366_days_is_rejected()
    {
        var (recruit, _) = await RecruitAsync("trends-367@example.com");
        var from = Today.AddDays(-366);

        var response = await recruit.GetAsync(
            $"/api/v1/dashboard/trends?from={from:yyyy-MM-dd}&to={Today:yyyy-MM-dd}"
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Reversed_range_is_rejected()
    {
        var (recruit, _) = await RecruitAsync("trends-reversed@example.com");

        var response = await recruit.GetAsync(
            $"/api/v1/dashboard/trends?from={Today:yyyy-MM-dd}&to={Today.AddDays(-1):yyyy-MM-dd}"
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
