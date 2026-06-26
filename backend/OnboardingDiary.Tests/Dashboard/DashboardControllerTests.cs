using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Dashboard.Dtos;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Tests.Integration;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Tests.Dashboard;

public class DashboardControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public DashboardControllerTests(TestWebApplicationFactory factory)
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

    [Fact]
    public async Task GetDashboard_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/dashboard");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task GetDashboard_AuthenticatedRecruit_Returns200()
    {
        var (client, userId) = await CreateAuthenticatedClient();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Tasks.Add(new TaskEntity { Id = Guid.NewGuid(), UserId = Guid.Parse(userId), Title = "T1", Date = DateTime.UtcNow, Status = TaskStatus.Completed, Category = TaskCategory.Training, Priority = Priority.Medium, CompletedAt = DateTime.UtcNow });
            db.Issues.Add(new Issue { Id = Guid.NewGuid(), UserId = Guid.Parse(userId), Title = "I1", Date = DateTime.UtcNow, Description = "d", Severity = IssueSeverity.Critical, Status = IssueStatus.Open });
            await db.SaveChangesAsync();
        }

        var res = await client.GetAsync("/api/dashboard");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOpts);
        Assert.NotNull(body);
        Assert.Equal(1, body!.TaskStats.Total);
        Assert.Equal(1, body.IssueStats.Total);
        Assert.Equal(1, body.IssueStats.Critical);
    }

    [Fact]
    public async Task GetDashboard_ExcludesSoftDeletedEntries()
    {
        var (client, userId) = await CreateAuthenticatedClient();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Tasks.Add(new TaskEntity { Id = Guid.NewGuid(), UserId = Guid.Parse(userId), Title = "Active", Date = DateTime.UtcNow, Status = TaskStatus.InProgress, Category = TaskCategory.Training, Priority = Priority.Medium });
            db.Tasks.Add(new TaskEntity { Id = Guid.NewGuid(), UserId = Guid.Parse(userId), Title = "Deleted", Date = DateTime.UtcNow, Status = TaskStatus.InProgress, Category = TaskCategory.Training, Priority = Priority.Medium, IsDeleted = true });
            await db.SaveChangesAsync();
        }

        var res = await client.GetAsync("/api/dashboard");
        var body = await res.Content.ReadFromJsonAsync<DashboardSummaryDto>(JsonOpts);

        Assert.Equal(1, body!.TaskStats.Total);
    }

    [Fact]
    public async Task GetTeam_RecruitReturns403()
    {
        var (client, _) = await CreateAuthenticatedClient(role: "Recruit");
        var res = await client.GetAsync("/api/dashboard/team");
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task GetTeam_ManagerReturnsAssignedRecruitsOnly()
    {
        var (managerClient, managerId) = await CreateAuthenticatedClient(role: "Manager");

        var (_, recruitId) = await CreateAuthenticatedClient(
            email: $"recruit{Guid.NewGuid():N}@example.com",
            role: "Recruit",
            managerId: Guid.Parse(managerId));

        var res = await managerClient.GetAsync("/api/dashboard/team");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recruits = doc.RootElement.GetProperty("recruits");

        Assert.True(recruits.GetArrayLength() >= 1);
        var ids = new List<string>();
        foreach (var r in recruits.EnumerateArray())
            ids.Add(r.GetProperty("id").GetString()!);
        Assert.Contains(recruitId, ids);
    }

    [Fact]
    public async Task GetTeam_AdminCanFilterByDepartment()
    {
        var (adminClient, _) = await CreateAuthenticatedClient(role: "Admin");

        var res = await adminClient.GetAsync("/api/dashboard/team?department=Engineering");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var recruits = doc.RootElement.GetProperty("recruits");

        foreach (var r in recruits.EnumerateArray())
            Assert.Equal("Engineering", r.GetProperty("department").GetString());
    }
}
