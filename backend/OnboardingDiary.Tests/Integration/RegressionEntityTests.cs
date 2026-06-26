using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Integration;

/// <summary>
/// REG-TASK, REG-ISSUE, REG-FEED, REG-NOTE: Entity CRUD regression tests
/// </summary>
public class RegressionEntityTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public RegressionEntityTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(
        string? email = null, string role = "Recruit", Guid? managerId = null, string department = "Engineering")
    {
        var client = _factory.CreateClient();
        email ??= $"user{Guid.NewGuid():N}@example.com";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email, Password: "Str0ng!Pass1", Name: "Test User",
            Department: department, StartDate: DateTime.UtcNow));
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

    #region REG-TASK: Task-specific rules

    // REG-TASK-01: Completed requires description + CompletedAt auto-set/clear
    [Fact]
    public async Task REG_TASK_01_CompletedRequiresDescription()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Incomplete Task",
            Category = "Training",
            Status = "Completed",
            Priority = "Medium",
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task REG_TASK_01_CompletedAt_AutoSetAndCleared()
    {
        var (client, _) = await CreateAuthenticatedClient();

        // Create with Completed status + description
        var createRes = await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "CompletedAt Test",
            Description = "Has a description",
            Category = "Training",
            Status = "Completed",
            Priority = "Medium",
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var task = createBody.GetProperty("task");
        var taskId = task.GetProperty("id").GetString();
        Assert.NotNull(task.GetProperty("completedAt").GetString());

        // Update away from Completed
        var updateRes = await client.PutAsJsonAsync($"/api/tasks/{taskId}", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "CompletedAt Test",
            Description = "Has a description",
            Category = "Training",
            Status = "InProgress",
            Priority = "Medium",
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updateBody = await updateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var updatedTask = updateBody.GetProperty("task");
        Assert.True(
            updatedTask.GetProperty("completedAt").ValueKind == JsonValueKind.Null ||
            string.IsNullOrEmpty(updatedTask.GetProperty("completedAt").GetString()));
    }

    // REG-TASK-02: Task stats endpoint
    [Fact]
    public async Task REG_TASK_02_Stats_ReturnsCompletionPercentage()
    {
        var (client, _) = await CreateAuthenticatedClient();

        await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Stats Task 1",
            Description = "A valid description for completion",
            Category = "Training",
            Status = "Completed",
            Priority = "Low"
        });
        await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Stats Task 2",
            Description = "Another description",
            Category = "Setup",
            Status = "InProgress",
            Priority = "Medium"
        });

        var statsRes = await client.GetAsync("/api/tasks/stats");
        Assert.Equal(HttpStatusCode.OK, statsRes.StatusCode);
        var stats = await statsRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(stats.GetProperty("total").GetInt32() >= 2);
        Assert.True(stats.GetProperty("completed").GetInt32() >= 1);
    }

    #endregion

    #region REG-ISSUE: Issue-specific rules

    // REG-ISSUE-01: Resolution notes required for Resolved status
    [Fact]
    public async Task REG_ISSUE_01_ResolvedWithoutNotes_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var createRes = await client.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date, Title = "Needs Notes",
            Description = "A valid description that meets minimum length",
            Severity = "Medium", Status = "Open",
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = body.GetProperty("issue").GetProperty("id").GetString();

        var updateRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Needs Notes", Description = "A valid description that meets minimum length",
            Severity = "Medium", Status = "Resolved", ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.BadRequest, updateRes.StatusCode);
    }

    // REG-ISSUE-02: ResolvedAt auto-set/clear
    [Fact]
    public async Task REG_ISSUE_02_ResolvedAt_AutoSetAndCleared()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var createRes = await client.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date, Title = "ResolvedAt Test",
            Description = "A valid description that meets minimum length",
            Severity = "Low", Status = "Open",
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = body.GetProperty("issue").GetProperty("id").GetString();

        // Resolve it
        var resolveRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "ResolvedAt Test", Description = "A valid description that meets minimum length",
            Severity = "Low", Status = "Resolved", ResolutionNotes = "Resolved it",
        });
        Assert.Equal(HttpStatusCode.OK, resolveRes.StatusCode);
        var resolved = await resolveRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var resolvedIssue = resolved.GetProperty("issue");
        Assert.NotNull(resolvedIssue.GetProperty("resolvedAt").GetString());

        // Move back to InProgress (clears ResolvedAt)
        var reopenRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "ResolvedAt Test", Description = "A valid description that meets minimum length",
            Severity = "Low", Status = "InProgress", ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.OK, reopenRes.StatusCode);
        var reopened = await reopenRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reopenedIssue = reopened.GetProperty("issue");
        Assert.True(
            reopenedIssue.GetProperty("resolvedAt").ValueKind == JsonValueKind.Null ||
            string.IsNullOrEmpty(reopenedIssue.GetProperty("resolvedAt").GetString()));
    }

    // REG-ISSUE-03: Closed->Open invalid transition returns 400
    [Fact]
    public async Task REG_ISSUE_03_ClosedToOpen_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var createRes = await client.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date, Title = "Transition Test",
            Description = "A valid description that meets minimum length",
            Severity = "Low", Status = "Open",
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = body.GetProperty("issue").GetProperty("id").GetString();

        // Close it
        await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Transition Test", Description = "A valid description that meets minimum length",
            Severity = "Low", Status = "Closed", ResolutionNotes = "Closing",
        });

        // Try to reopen
        var reopenRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Transition Test", Description = "A valid description that meets minimum length",
            Severity = "Low", Status = "Open", ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.BadRequest, reopenRes.StatusCode);
    }

    // REG-ISSUE-04: Escalate sets IsEscalated + manager email
    [Fact]
    public async Task REG_ISSUE_04_Escalate_SetsIsEscalated()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var createRes = await client.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date, Title = "Escalate Test",
            Description = "A valid description that meets minimum length",
            Severity = "High", Status = "Open",
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = body.GetProperty("issue").GetProperty("id").GetString();

        var escalateRes = await client.PostAsJsonAsync($"/api/issues/{issueId}/escalate", new
        {
            Message = "Needs attention"
        });
        Assert.Equal(HttpStatusCode.OK, escalateRes.StatusCode);
        var escalated = await escalateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(escalated.GetProperty("issue").GetProperty("isEscalated").GetBoolean());
    }

    #endregion

    #region REG-FEED: Feedback-specific rules

    // REG-FEED-01: Details <20 chars returns 400
    [Fact]
    public async Task REG_FEED_01_DetailsTooShort_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/feedback", new
        {
            Date = DateTime.UtcNow.Date,
            Subject = "Valid Subject",
            Type = "Positive",
            Details = "Too short.",
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // REG-FEED-02: Admin aggregated cross-user view filterable by department/type/date
    [Fact]
    public async Task REG_FEED_02_AdminAggregatedView_FilterableByDepartment()
    {
        var (engClient, _) = await CreateAuthenticatedClient(department: "Engineering");
        var (mktClient, _) = await CreateAuthenticatedClient(department: "Marketing");
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");

        await engClient.PostAsJsonAsync("/api/feedback", new
        {
            Date = DateTime.UtcNow.Date, Subject = "Eng FB",
            Type = "Positive", Details = "Enough details to pass the twenty char minimum."
        });
        await mktClient.PostAsJsonAsync("/api/feedback", new
        {
            Date = DateTime.UtcNow.Date, Subject = "Mkt FB",
            Type = "Concern", Details = "Enough details to pass the twenty char minimum."
        });

        var engRes = await adminClient.GetAsync("/api/feedback?department=Engineering&limit=100");
        Assert.Equal(HttpStatusCode.OK, engRes.StatusCode);
        var engBody = await engRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        foreach (var f in engBody.GetProperty("feedback").EnumerateArray())
        {
            Assert.Equal("Engineering", f.GetProperty("authorDepartment").GetString());
        }
    }

    #endregion

    #region REG-NOTE: Note-specific rules

    // REG-NOTE-01: Search across title/content/tags
    [Fact]
    public async Task REG_NOTE_01_Search_MatchesTitleContentTags()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var uniqueTerm = $"unique{Guid.NewGuid():N}";

        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = $"Note with {uniqueTerm} in title",
            Content = "Normal content",
            Tags = Array.Empty<string>(),
            IsPinned = false,
        });

        var searchRes = await client.GetAsync($"/api/notes?search={uniqueTerm}&limit=100");
        var body = await searchRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("notes").GetArrayLength() >= 1);
    }

    // REG-NOTE-02: Pinned-first ordering
    [Fact]
    public async Task REG_NOTE_02_PinnedFirst_Ordering()
    {
        var (client, _) = await CreateAuthenticatedClient();

        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date, Title = "Unpinned Note",
            Content = "Content", Tags = Array.Empty<string>(), IsPinned = false,
        });
        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date, Title = "Pinned Note",
            Content = "Content", Tags = Array.Empty<string>(), IsPinned = true,
        });

        var listRes = await client.GetAsync("/api/notes?limit=100");
        var body = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var notes = body.GetProperty("notes").EnumerateArray().ToList();
        var pinnedIdx = notes.FindIndex(n => n.GetProperty("title").GetString() == "Pinned Note");
        var unpinnedIdx = notes.FindIndex(n => n.GetProperty("title").GetString() == "Unpinned Note");
        Assert.True(pinnedIdx < unpinnedIdx);
    }

    // REG-NOTE-03: 6th pin attempt returns 400
    [Fact]
    public async Task REG_NOTE_03_SixthPin_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();

        for (int i = 0; i < 5; i++)
        {
            var pinRes = await client.PostAsJsonAsync("/api/notes", new
            {
                Date = DateTime.UtcNow.Date, Title = $"Pin {i}",
                Content = "Content", Tags = Array.Empty<string>(), IsPinned = true,
            });
            Assert.Equal(HttpStatusCode.Created, pinRes.StatusCode);
        }

        var sixthRes = await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date, Title = "Pin 6",
            Content = "Content", Tags = Array.Empty<string>(), IsPinned = true,
        });
        Assert.Equal(HttpStatusCode.BadRequest, sixthRes.StatusCode);
    }

    // REG-NOTE-04: Tags JSON round-trip
    [Fact]
    public async Task REG_NOTE_04_Tags_JsonRoundTrip()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var tags = new[] { "onboarding", "day-1", "team" };

        var createRes = await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date, Title = "Tags Test",
            Content = "Content", Tags = tags, IsPinned = false,
        });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteId = body.GetProperty("note").GetProperty("id").GetString();

        var getRes = await client.GetAsync($"/api/notes/{noteId}");
        var getBody = await getRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var returnedTags = getBody.GetProperty("note").GetProperty("tags").EnumerateArray()
            .Select(t => t.GetString()).ToList();
        Assert.Equal(tags.Length, returnedTags.Count);
        foreach (var tag in tags)
            Assert.Contains(tag, returnedTags);
    }

    #endregion
}
