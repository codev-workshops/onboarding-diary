using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Admin;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Features.Team;

namespace OnboardingDiary.IntegrationTests;

public class TeamAndAdminEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
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

        return (await LoginAsync(email), userId);
    }

    private async Task<HttpClient> LoginAsync(string email)
    {
        var client = factory.CreateClient();
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, Password)
        );
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);

        var auth = (await login.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions.Api))!;
        return Authorized(client, auth.AccessToken);
    }

    private static HttpClient Authorized(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            token
        );
        return client;
    }

    private Task AssignAsync(int recruitId, int managerId) =>
        factory.WithDbAsync(async db =>
        {
            var recruit = await db.Users.FirstAsync(u => u.Id == recruitId);
            recruit.ManagerId = managerId;
            return await db.SaveChangesAsync();
        });

    [Fact]
    public async Task Manager_roster_lists_only_assigned_recruits_with_their_progress()
    {
        var (mine, mineId) = await RecruitAsync("roster-mine@example.com");
        var (_, otherId) = await RecruitAsync("roster-other@example.com");
        var (manager, managerId) = await PromotedAsync("roster-manager@example.com", UserRole.Manager);
        await AssignAsync(mineId, managerId);

        await mine.PostAsJsonAsync(
            "/api/v1/tasks",
            new CreateTaskRequest(
                Today,
                "Read the handbook",
                null,
                TaskCategory.Training,
                TaskEntryStatus.Done,
                TaskPriority.Medium
            )
        );
        await mine.PostAsJsonAsync(
            "/api/v1/tasks",
            new CreateTaskRequest(
                Today,
                "Set up the laptop",
                null,
                TaskCategory.Setup,
                TaskEntryStatus.InProgress,
                TaskPriority.Medium
            )
        );
        await mine.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(Today, "VPN will not connect", null, IssueSeverity.High)
        );

        var roster = (
            await manager.GetFromJsonAsync<PagedResponse<TeamMemberResponse>>(
                "/api/v1/team/recruits",
                JsonOptions.Api
            )
        )!;

        var member = Assert.Single(roster.Items);
        Assert.Equal(mineId, member.UserId);
        Assert.DoesNotContain(roster.Items, m => m.UserId == otherId);
        Assert.Equal(2, member.TaskCount);
        Assert.Equal(50, member.CompletionPercentage);
        Assert.Equal(1, member.OpenIssueCount);
        Assert.NotNull(member.LastActivityAt);
    }

    [Fact]
    public async Task Manager_reads_an_assigned_recruit_but_cannot_write_entries()
    {
        var (recruit, recruitId) = await RecruitAsync("scope-recruit@example.com");
        var (manager, managerId) = await PromotedAsync("scope-manager@example.com", UserRole.Manager);
        await AssignAsync(recruitId, managerId);

        await recruit.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(Today, "Laptop is missing", null, IssueSeverity.Medium)
        );

        var member = (
            await manager.GetFromJsonAsync<TeamMemberResponse>(
                $"/api/v1/team/recruits/{recruitId}",
                JsonOptions.Api
            )
        )!;
        Assert.Equal(recruitId, member.UserId);

        var issues = (
            await manager.GetFromJsonAsync<PagedResponse<IssueResponse>>(
                $"/api/v1/issues?userId={recruitId}",
                JsonOptions.Api
            )
        )!;
        Assert.Single(issues.Items);

        var write = await manager.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(Today, "Manager written", null, IssueSeverity.Low)
        );
        Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);
    }

    [Fact]
    public async Task Manager_cannot_reach_an_unassigned_recruit_or_the_admin_area()
    {
        var (_, strangerId) = await RecruitAsync("scope-stranger@example.com");
        var (manager, _) = await PromotedAsync("scope-outsider@example.com", UserRole.Manager);

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await manager.GetAsync($"/api/v1/tasks?userId={strangerId}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await manager.GetAsync($"/api/v1/team/recruits/{strangerId}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await manager.GetAsync("/api/v1/admin/users")).StatusCode
        );
    }

    [Fact]
    public async Task Recruit_cannot_reach_the_team_roster_or_the_admin_area()
    {
        var (recruit, _) = await RecruitAsync("scope-plain@example.com");

        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await recruit.GetAsync("/api/v1/team/recruits")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await recruit.GetAsync("/api/v1/admin/users")).StatusCode
        );
    }

    [Fact]
    public async Task Admin_creates_a_recruit_assigned_to_a_manager()
    {
        var (admin, _) = await PromotedAsync("create-admin@example.com", UserRole.Admin);
        var (_, managerId) = await PromotedAsync("create-manager@example.com", UserRole.Manager);

        var response = await admin.PostAsJsonAsync(
            "/api/v1/admin/users",
            new CreateUserRequest(
                "Created.Recruit@example.com",
                Password,
                "Created Recruit",
                UserRole.Recruit,
                null,
                managerId,
                Today
            )
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = (await response.Content.ReadFromJsonAsync<AdminUserResponse>(JsonOptions.Api))!;
        Assert.Equal("created.recruit@example.com", created.Email);
        Assert.Equal(managerId, created.ManagerId);
        Assert.True(created.IsActive);

        var duplicate = await admin.PostAsJsonAsync(
            "/api/v1/admin/users",
            new CreateUserRequest(
                "created.recruit@example.com",
                Password,
                "Duplicate",
                UserRole.Recruit,
                null,
                null,
                Today
            )
        );
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var listed = (
            await admin.GetFromJsonAsync<PagedResponse<AdminUserResponse>>(
                $"/api/v1/admin/users?managerId={managerId}",
                JsonOptions.Api
            )
        )!;
        Assert.Contains(listed.Items, u => u.Id == created.Id);
    }

    [Fact]
    public async Task Only_a_recruit_may_be_assigned_to_an_active_manager()
    {
        var (admin, _) = await PromotedAsync("assign-admin@example.com", UserRole.Admin);
        var (_, managerId) = await PromotedAsync("assign-manager@example.com", UserRole.Manager);
        var (_, recruitId) = await RecruitAsync("assign-recruit@example.com");

        var managerWithManager = await admin.PostAsJsonAsync(
            "/api/v1/admin/users",
            new CreateUserRequest(
                "second.manager@example.com",
                Password,
                "Second Manager",
                UserRole.Manager,
                null,
                managerId,
                null
            )
        );
        Assert.Equal(HttpStatusCode.BadRequest, managerWithManager.StatusCode);

        var recruitAsManager = await admin.PatchAsJsonAsync(
            $"/api/v1/admin/users/{recruitId}",
            new UpdateUserRequest("Assign Recruit", UserRole.Recruit, null, recruitId, Today, true)
        );
        Assert.Equal(HttpStatusCode.BadRequest, recruitAsManager.StatusCode);
    }

    [Fact]
    public async Task Deactivating_a_manager_releases_their_recruits()
    {
        var (admin, _) = await PromotedAsync("release-admin@example.com", UserRole.Admin);
        var (_, managerId) = await PromotedAsync("release-manager@example.com", UserRole.Manager);
        var (_, recruitId) = await RecruitAsync("release-recruit@example.com");
        await AssignAsync(recruitId, managerId);

        var response = await admin.PatchAsJsonAsync(
            $"/api/v1/admin/users/{managerId}",
            new UpdateUserRequest("Release Manager", UserRole.Manager, null, null, null, false)
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var recruit = await factory.WithDbAsync(db =>
            db.Users.AsNoTracking().FirstAsync(u => u.Id == recruitId)
        );
        Assert.Null(recruit.ManagerId);

        var login = await factory.CreateClient()
            .PostAsJsonAsync(
                "/api/v1/auth/login",
                new LoginRequest("release-manager@example.com", Password)
            );
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Admin_cannot_demote_or_deactivate_themselves()
    {
        var (admin, adminId) = await PromotedAsync("self-admin@example.com", UserRole.Admin);

        var demote = await admin.PatchAsJsonAsync(
            $"/api/v1/admin/users/{adminId}",
            new UpdateUserRequest("Self Admin", UserRole.Recruit, null, null, null, true)
        );
        Assert.Equal(HttpStatusCode.BadRequest, demote.StatusCode);

        var deactivate = await admin.PatchAsJsonAsync(
            $"/api/v1/admin/users/{adminId}",
            new UpdateUserRequest("Self Admin", UserRole.Admin, null, null, null, false)
        );
        Assert.Equal(HttpStatusCode.BadRequest, deactivate.StatusCode);
    }

    [Fact]
    public async Task Admin_stats_count_users_and_open_work()
    {
        var (admin, _) = await PromotedAsync("stats-admin@example.com", UserRole.Admin);

        var stats = (
            await admin.GetFromJsonAsync<AdminStatsResponse>("/api/v1/admin/stats", JsonOptions.Api)
        )!;

        Assert.True(stats.TotalUsers >= 1);
        Assert.True(stats.Admins >= 1);
        Assert.Equal(
            stats.TotalUsers,
            stats.Recruits + stats.Managers + stats.Admins
        );
        Assert.True(stats.ActiveUsers <= stats.TotalUsers);
    }

    [Fact]
    public async Task Admin_roster_sees_every_recruit_and_can_filter_by_manager()
    {
        var (admin, _) = await PromotedAsync("all-admin@example.com", UserRole.Admin);
        var (_, managerId) = await PromotedAsync("all-manager@example.com", UserRole.Manager);
        var (_, assignedId) = await RecruitAsync("all-assigned@example.com");
        await RecruitAsync("all-unassigned@example.com");
        await AssignAsync(assignedId, managerId);

        var everyone = (
            await admin.GetFromJsonAsync<PagedResponse<TeamMemberResponse>>(
                "/api/v1/team/recruits?pageSize=100",
                JsonOptions.Api
            )
        )!;
        Assert.True(everyone.Total >= 2);

        var filtered = (
            await admin.GetFromJsonAsync<PagedResponse<TeamMemberResponse>>(
                $"/api/v1/team/recruits?managerId={managerId}",
                JsonOptions.Api
            )
        )!;
        var member = Assert.Single(filtered.Items);
        Assert.Equal(assignedId, member.UserId);
    }
}
