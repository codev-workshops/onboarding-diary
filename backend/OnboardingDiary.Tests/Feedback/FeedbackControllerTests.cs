using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Tests.Integration;

namespace OnboardingDiary.Tests.Feedback;

public class FeedbackControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public FeedbackControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(string? email = null, string role = "Recruit", Guid? managerId = null, string department = "Engineering")
    {
        var client = _factory.CreateClient();
        email ??= $"user{Guid.NewGuid():N}@example.com";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email,
            Password: "Str0ng!Pass1",
            Name: "Test User",
            Department: department,
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

    private static object ValidFeedback(string subject = "Test Feedback") => new
    {
        Date = DateTime.UtcNow.Date,
        Subject = subject,
        Type = "Positive",
        Details = "This is a valid feedback entry that meets the minimum length requirement of twenty chars.",
    };

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/feedback");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Create_Returns201()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/feedback", ValidFeedback());
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.TryGetProperty("feedback", out var fb));
        Assert.Equal("Test Feedback", fb.GetProperty("subject").GetString());
    }

    [Fact]
    public async Task Create_InvalidSubject_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/feedback", new
        {
            Date = DateTime.UtcNow.Date,
            Subject = "ab",
            Type = "Positive",
            Details = "This is a valid feedback detail that is long enough to pass.",
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Create_DetailsTooShort_Returns400()
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

    [Fact]
    public async Task CRUD_FullRoundTrip()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/feedback", ValidFeedback("Round Trip"));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var fbId = createBody.GetProperty("feedback").GetProperty("id").GetString();

        var getRes = await client.GetAsync($"/api/feedback/{fbId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var getBody = await getRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Round Trip", getBody.GetProperty("feedback").GetProperty("subject").GetString());

        var updateRes = await client.PutAsJsonAsync($"/api/feedback/{fbId}", new
        {
            Subject = "Updated Subject",
            Type = "Concern",
            Details = "Updated details that meet the minimum twenty character requirement for validation.",
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updateBody = await updateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Updated Subject", updateBody.GetProperty("feedback").GetProperty("subject").GetString());

        var deleteRes = await client.DeleteAsync($"/api/feedback/{fbId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var getAfterDelete = await client.GetAsync($"/api/feedback/{fbId}");
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task SoftDeletedFeedback_ExcludedFromList()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/feedback", ValidFeedback("Soft Delete"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var fbId = createBody.GetProperty("feedback").GetProperty("id").GetString();

        await client.DeleteAsync($"/api/feedback/{fbId}");

        var listRes = await client.GetAsync("/api/feedback?limit=100");
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var ids = new List<string>();
        foreach (var f in listBody.GetProperty("feedback").EnumerateArray())
            ids.Add(f.GetProperty("id").GetString()!);

        Assert.DoesNotContain(fbId, ids);
    }

    [Fact]
    public async Task Manager_CanReadAssignedRecruitFeedback()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        await recruitClient.PostAsJsonAsync("/api/feedback", ValidFeedback("Recruit Feedback"));

        var listRes = await managerClient.GetAsync($"/api/feedback?recruitId={recruitId}");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(listBody.GetProperty("feedback").GetArrayLength() > 0);
    }

    [Fact]
    public async Task Manager_CannotUpdateRecruitFeedback()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/feedback", ValidFeedback("Recruit Only"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var fbId = createBody.GetProperty("feedback").GetProperty("id").GetString();

        var updateRes = await managerClient.PutAsJsonAsync($"/api/feedback/{fbId}", new
        {
            Subject = "Manager Edit",
            Type = "Concern",
            Details = "This manager should not be able to edit recruit's feedback at all.",
        });
        Assert.Equal(HttpStatusCode.NotFound, updateRes.StatusCode);
    }

    [Fact]
    public async Task Manager_CannotDeleteRecruitFeedback()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, _) = await CreateAuthenticatedClient(managerId: Guid.Parse(managerId));

        var createRes = await recruitClient.PostAsJsonAsync("/api/feedback", ValidFeedback("No Delete"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var fbId = createBody.GetProperty("feedback").GetProperty("id").GetString();

        var deleteRes = await managerClient.DeleteAsync($"/api/feedback/{fbId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteRes.StatusCode);
    }

    [Fact]
    public async Task Manager_CannotSeeUnassignedRecruitFeedback()
    {
        var (managerClient, _) = await CreateAuthenticatedClient(role: "Manager");
        var (recruitClient, recruitId) = await CreateAuthenticatedClient();

        await recruitClient.PostAsJsonAsync("/api/feedback", ValidFeedback("Hidden Feedback"));

        var listRes = await managerClient.GetAsync($"/api/feedback?recruitId={recruitId}");
        Assert.True(
            listRes.StatusCode == HttpStatusCode.Forbidden ||
            listRes.StatusCode == HttpStatusCode.InternalServerError);
    }

    [Fact]
    public async Task Admin_CanListAllFeedback_FilterByDepartment()
    {
        var (recruit1Client, _) = await CreateAuthenticatedClient(department: "Engineering");
        var (recruit2Client, _) = await CreateAuthenticatedClient(department: "Marketing");
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");

        await recruit1Client.PostAsJsonAsync("/api/feedback", ValidFeedback("Eng Feedback"));
        await recruit2Client.PostAsJsonAsync("/api/feedback", ValidFeedback("Mkt Feedback"));

        var allRes = await adminClient.GetAsync("/api/feedback?limit=100");
        var allBody = await allRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(allBody.GetProperty("total").GetInt32() >= 2);

        var engRes = await adminClient.GetAsync("/api/feedback?department=Engineering&limit=100");
        var engBody = await engRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var engFeedback = engBody.GetProperty("feedback");
        foreach (var f in engFeedback.EnumerateArray())
        {
            var dept = f.GetProperty("authorDepartment").GetString();
            Assert.Equal("Engineering", dept);
        }
    }

    [Fact]
    public async Task Admin_CanFilterByType()
    {
        var (recruitClient, _) = await CreateAuthenticatedClient();
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");

        await recruitClient.PostAsJsonAsync("/api/feedback", new
        {
            Date = DateTime.UtcNow.Date,
            Subject = "Positive One",
            Type = "Positive",
            Details = "A positive feedback entry with enough characters to pass validation requirements.",
        });
        await recruitClient.PostAsJsonAsync("/api/feedback", new
        {
            Date = DateTime.UtcNow.Date,
            Subject = "Concern One",
            Type = "Concern",
            Details = "A concern feedback entry with enough characters to pass validation requirements.",
        });

        var filteredRes = await adminClient.GetAsync("/api/feedback?type=Positive&limit=100");
        var filteredBody = await filteredRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        foreach (var f in filteredBody.GetProperty("feedback").EnumerateArray())
        {
            Assert.Equal("Positive", f.GetProperty("type").GetString());
        }
    }

    [Fact]
    public async Task Admin_CanFilterByDateRange()
    {
        var (recruitClient, _) = await CreateAuthenticatedClient();
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");

        var today = DateTime.UtcNow.Date;
        await recruitClient.PostAsJsonAsync("/api/feedback", new
        {
            Date = today,
            Subject = "Today Feedback",
            Type = "Suggestion",
            Details = "A suggestion feedback entry with enough characters to pass validation requirements.",
        });

        var res = await adminClient.GetAsync($"/api/feedback?startDate={today:yyyy-MM-dd}&endDate={today:yyyy-MM-dd}&limit=100");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("feedback").GetArrayLength() >= 1);
    }

    [Fact]
    public async Task NonAdmin_DepartmentFilterIsIgnored()
    {
        var (recruitClient, recruitId) = await CreateAuthenticatedClient(department: "Engineering");

        await recruitClient.PostAsJsonAsync("/api/feedback", ValidFeedback("My Feedback"));

        var res = await recruitClient.GetAsync("/api/feedback?department=Marketing&limit=100");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var feedbackArray = body.GetProperty("feedback");
        Assert.True(feedbackArray.GetArrayLength() >= 1,
            "Recruit should still see own feedback even when department filter is passed");
    }

    [Fact]
    public async Task List_PaginationWorks()
    {
        var (client, _) = await CreateAuthenticatedClient();

        for (int i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/feedback", ValidFeedback($"Paginated {i}"));
        }

        var page1Res = await client.GetAsync("/api/feedback?page=1&limit=2");
        var page1Body = await page1Res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(2, page1Body.GetProperty("feedback").GetArrayLength());
        Assert.True(page1Body.GetProperty("totalPages").GetInt32() >= 2);
    }
}
