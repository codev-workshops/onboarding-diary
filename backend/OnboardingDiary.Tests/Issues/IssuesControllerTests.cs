using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Tests.Integration;

namespace OnboardingDiary.Tests.Issues;

public class IssuesControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public IssuesControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
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

    private static object ValidIssue(string title = "Test Issue") => new
    {
        Date = DateTime.UtcNow.Date,
        Title = title,
        Description = "A valid description that meets the minimum length requirement",
        Severity = "Medium",
        Status = "Open",
    };

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/issues");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Create_Returns201()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/issues", ValidIssue());
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.TryGetProperty("issue", out var issue));
        Assert.Equal("Test Issue", issue.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Create_InvalidTitle_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "ab",
            Description = "A valid description that meets the minimum length",
            Severity = "Medium",
            Status = "Open",
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task CRUD_FullRoundTrip()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/issues", ValidIssue("Round Trip Issue"));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        var getRes = await client.GetAsync($"/api/issues/{issueId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var getBody = await getRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Round Trip Issue", getBody.GetProperty("issue").GetProperty("title").GetString());

        var updateRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Updated Issue Title",
            Description = "Updated description that meets the minimum length requirement",
            Severity = "High",
            Status = "InProgress",
            ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updateBody = await updateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Updated Issue Title", updateBody.GetProperty("issue").GetProperty("title").GetString());

        var deleteRes = await client.DeleteAsync($"/api/issues/{issueId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var getAfterDelete = await client.GetAsync($"/api/issues/{issueId}");
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task List_PaginationAndFiltering()
    {
        var (client, _) = await CreateAuthenticatedClient();

        for (int i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/issues", new
            {
                Date = DateTime.UtcNow.Date,
                Title = $"Filter Issue {i}",
                Description = "A valid description that meets the minimum length requirement",
                Severity = i < 3 ? "Low" : "Critical",
                Status = "Open",
            });
        }

        var allRes = await client.GetAsync("/api/issues?limit=100");
        var allBody = await allRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(allBody.GetProperty("total").GetInt32() >= 5);

        var filteredRes = await client.GetAsync("/api/issues?severity=Low&limit=100");
        var filteredBody = await filteredRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(filteredBody.GetProperty("issues").GetArrayLength() >= 3);

        var page1Res = await client.GetAsync("/api/issues?page=1&limit=2");
        var page1Body = await page1Res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(2, page1Body.GetProperty("issues").GetArrayLength());
        Assert.True(page1Body.GetProperty("totalPages").GetInt32() >= 2);
    }

    [Fact]
    public async Task SoftDeletedIssues_ExcludedFromList()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/issues", ValidIssue("Soft Delete Issue"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        await client.DeleteAsync($"/api/issues/{issueId}");

        var listRes = await client.GetAsync("/api/issues?limit=100");
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueIds = new List<string>();
        foreach (var i in listBody.GetProperty("issues").EnumerateArray())
            issueIds.Add(i.GetProperty("id").GetString()!);

        Assert.DoesNotContain(issueId, issueIds);
    }

    [Fact]
    public async Task Manager_CanReadAssignedRecruitIssues()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        await recruitClient.PostAsJsonAsync("/api/issues", ValidIssue("Recruit Issue"));

        var listRes = await managerClient.GetAsync($"/api/issues?recruitId={recruitId}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(listBody.GetProperty("issues").GetArrayLength() > 0);
    }

    [Fact]
    public async Task Manager_CannotUpdateRecruitIssue()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/issues", ValidIssue("Recruit Only Issue"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        var updateRes = await managerClient.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Manager Edit Attempt",
            Description = "A valid description that meets the minimum length requirement",
            Severity = "Medium",
            Status = "InProgress",
            ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.NotFound, updateRes.StatusCode);
    }

    [Fact]
    public async Task Manager_CannotDeleteRecruitIssue()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/issues", ValidIssue("No Delete Issue"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        var deleteRes = await managerClient.DeleteAsync($"/api/issues/{issueId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteRes.StatusCode);
    }

    [Fact]
    public async Task Escalate_SetsFlag()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/issues", ValidIssue("Escalate Issue"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        var escalateRes = await client.PostAsJsonAsync($"/api/issues/{issueId}/escalate", new
        {
            Message = "This needs manager attention"
        });
        Assert.Equal(HttpStatusCode.OK, escalateRes.StatusCode);
        var escalateBody = await escalateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(escalateBody.GetProperty("issue").GetProperty("isEscalated").GetBoolean());
    }

    [Fact]
    public async Task InvalidStatusTransition_ClosedToOpen_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/issues", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Closed Issue",
            Description = "A valid description that meets the minimum length requirement",
            Severity = "Low",
            Status = "Closed",
            ResolutionNotes = "Closed from start",
        });

        // The create endpoint doesn't take ResolutionNotes; need to create as Open then update to Closed
        var createRes2 = await client.PostAsJsonAsync("/api/issues", ValidIssue("Transition Test"));
        var createBody = await createRes2.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        // Update to Closed
        var closeRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Transition Test",
            Description = "A valid description that meets the minimum length requirement",
            Severity = "Low",
            Status = "Closed",
            ResolutionNotes = "Closing it",
        });
        Assert.Equal(HttpStatusCode.OK, closeRes.StatusCode);

        // Try to reopen
        var reopenRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Transition Test",
            Description = "A valid description that meets the minimum length requirement",
            Severity = "Low",
            Status = "Open",
            ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.BadRequest, reopenRes.StatusCode);
    }

    [Fact]
    public async Task ResolvedWithoutResolutionNotes_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/issues", ValidIssue("Needs Notes"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var issueId = createBody.GetProperty("issue").GetProperty("id").GetString();

        var updateRes = await client.PutAsJsonAsync($"/api/issues/{issueId}", new
        {
            Title = "Needs Notes",
            Description = "A valid description that meets the minimum length requirement",
            Severity = "Medium",
            Status = "Resolved",
            ResolutionNotes = (string?)null,
        });
        Assert.Equal(HttpStatusCode.BadRequest, updateRes.StatusCode);
    }
}
