using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Dashboard;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.IntegrationTests;

public class DiaryEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = DateOnly.FromDateTime(DateTime.UtcNow);

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

    private async Task<HttpClient> ManagerAsync(string email, int recruitId)
    {
        var (_, userId) = await RecruitAsync(email);

        await factory.WithDbAsync(async db =>
        {
            var manager = await db.Users.FirstAsync(u => u.Id == userId);
            manager.Role = UserRole.Manager;

            var recruit = await db.Users.FirstAsync(u => u.Id == recruitId);
            recruit.ManagerId = userId;

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

    private static async Task<IssueResponse> CreateIssueAsync(
        HttpClient client,
        string title = "VPN will not connect",
        IssueSeverity severity = IssueSeverity.High
    )
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(Today, title, "Times out on the first handshake", severity)
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<IssueResponse>(JsonOptions.Api))!;
    }

    private static UpdateIssueRequest Move(
        IssueResponse issue,
        IssueStatus status,
        string? resolutionNotes = null
    ) => new(issue.EntryDate, issue.Title, issue.Description, issue.Severity, status, resolutionNotes);

    [Fact]
    public async Task Recruit_can_create_read_update_and_delete_an_issue()
    {
        var (client, userId) = await RecruitAsync("issues-crud@example.com");

        var created = await CreateIssueAsync(client);
        Assert.Equal(userId, created.UserId);
        Assert.Equal(IssueStatus.Open, created.Status);
        Assert.Null(created.ResolvedAt);

        var updated = await client.PatchAsJsonAsync(
            $"/api/v1/issues/{created.Id}",
            Move(created with { Title = "VPN drops every hour" }, IssueStatus.InProgress)
        );
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var issue = (await updated.Content.ReadFromJsonAsync<IssueResponse>(JsonOptions.Api))!;
        Assert.Equal(IssueStatus.InProgress, issue.Status);
        Assert.Equal("VPN drops every hour", issue.Title);

        var deleted = await client.DeleteAsync($"/api/v1/issues/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/v1/issues/{created.Id}")).StatusCode
        );
    }

    [Fact]
    public async Task Resolving_an_issue_requires_notes_and_stamps_the_resolution_time()
    {
        var (client, _) = await RecruitAsync("issues-resolution@example.com");
        var created = await CreateIssueAsync(client);

        var withoutNotes = await client.PatchAsJsonAsync(
            $"/api/v1/issues/{created.Id}",
            Move(created, IssueStatus.Resolved)
        );
        Assert.Equal(HttpStatusCode.BadRequest, withoutNotes.StatusCode);
        var problem = (
            await withoutNotes.Content.ReadFromJsonAsync<ValidationProblemDetails>(JsonOptions.Api)
        )!;
        Assert.Contains("ResolutionNotes", problem.Errors.Keys);

        var resolved = await client.PatchAsJsonAsync(
            $"/api/v1/issues/{created.Id}",
            Move(created, IssueStatus.Resolved, "IT reissued the certificate.")
        );
        Assert.Equal(HttpStatusCode.OK, resolved.StatusCode);
        var issue = (await resolved.Content.ReadFromJsonAsync<IssueResponse>(JsonOptions.Api))!;
        Assert.Equal(IssueStatus.Resolved, issue.Status);
        Assert.Equal("IT reissued the certificate.", issue.ResolutionNotes);
        Assert.NotNull(issue.ResolvedAt);

        var reopened = await client.PatchAsJsonAsync(
            $"/api/v1/issues/{created.Id}",
            Move(created, IssueStatus.Open)
        );
        Assert.Equal(HttpStatusCode.OK, reopened.StatusCode);
        var open = (await reopened.Content.ReadFromJsonAsync<IssueResponse>(JsonOptions.Api))!;
        Assert.Null(open.ResolvedAt);
        Assert.Null(open.ResolutionNotes);
    }

    [Fact]
    public async Task An_unreachable_status_transition_is_rejected()
    {
        var (client, _) = await RecruitAsync("issues-transition@example.com");
        var created = await CreateIssueAsync(client);

        var response = await client.PatchAsJsonAsync(
            $"/api/v1/issues/{created.Id}",
            Move(created, IssueStatus.Closed, "Closing straight from open.")
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Issues_can_be_filtered_by_severity_and_status()
    {
        var (client, _) = await RecruitAsync("issues-filters@example.com");
        await CreateIssueAsync(client, "Critical outage", IssueSeverity.Critical);
        var low = await CreateIssueAsync(client, "Chair is wobbly", IssueSeverity.Low);
        await client.PatchAsJsonAsync(
            $"/api/v1/issues/{low.Id}",
            Move(low, IssueStatus.InProgress)
        );

        var critical = await client.GetFromJsonAsync<PagedResponse<IssueResponse>>(
            "/api/v1/issues?severity=Critical",
            JsonOptions.Api
        );
        Assert.Equal("Critical outage", Assert.Single(critical!.Items).Title);

        var inProgress = await client.GetFromJsonAsync<PagedResponse<IssueResponse>>(
            "/api/v1/issues?status=InProgress",
            JsonOptions.Api
        );
        Assert.Equal("Chair is wobbly", Assert.Single(inProgress!.Items).Title);
    }

    [Fact]
    public async Task Feedback_supports_crud_and_a_type_filter()
    {
        var (client, userId) = await RecruitAsync("feedback-crud@example.com");

        var response = await client.PostAsJsonAsync(
            "/api/v1/feedback",
            new CreateFeedbackRequest(
                Today,
                "Buddy system works",
                "Pairing in week one saved me days.",
                FeedbackType.Positive
            )
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<FeedbackResponse>(JsonOptions.Api))!;
        Assert.Equal(userId, created.UserId);

        await client.PostAsJsonAsync(
            "/api/v1/feedback",
            new CreateFeedbackRequest(
                Today,
                "Docs are stale",
                "The setup guide still lists the old repo.",
                FeedbackType.Concern
            )
        );

        var updated = await client.PatchAsJsonAsync(
            $"/api/v1/feedback/{created.Id}",
            new UpdateFeedbackRequest(
                Today,
                "Buddy system works well",
                "Pairing in week one saved me days.",
                FeedbackType.Positive
            )
        );
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);

        var concerns = await client.GetFromJsonAsync<PagedResponse<FeedbackResponse>>(
            "/api/v1/feedback?type=Concern",
            JsonOptions.Api
        );
        Assert.Equal("Docs are stale", Assert.Single(concerns!.Items).Title);

        Assert.Equal(
            HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/v1/feedback/{created.Id}")).StatusCode
        );
    }

    [Fact]
    public async Task Note_tags_are_normalised_and_can_be_filtered_and_searched()
    {
        var (client, _) = await RecruitAsync("notes-tags@example.com");

        var response = await client.PostAsJsonAsync(
            "/api/v1/notes",
            new CreateNoteRequest(
                Today,
                "Deployment walkthrough",
                "The release train leaves on Thursday.",
                ["Deploy", " deploy ", "Release"]
            )
        );
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<NoteResponse>(JsonOptions.Api))!;
        Assert.Equal(["deploy", "release"], created.Tags);

        await client.PostAsJsonAsync(
            "/api/v1/notes",
            new CreateNoteRequest(Today, "Coffee machine", "Third floor, needs a card.", ["office"])
        );

        var tagged = await client.GetFromJsonAsync<PagedResponse<NoteResponse>>(
            "/api/v1/notes?tag=DEPLOY",
            JsonOptions.Api
        );
        Assert.Equal("Deployment walkthrough", Assert.Single(tagged!.Items).Title);

        var searched = await client.GetFromJsonAsync<PagedResponse<NoteResponse>>(
            "/api/v1/notes?q=card",
            JsonOptions.Api
        );
        Assert.Equal("Coffee machine", Assert.Single(searched!.Items).Title);

        var retagged = await client.PatchAsJsonAsync(
            $"/api/v1/notes/{created.Id}",
            new UpdateNoteRequest(Today, created.Title, created.Content, ["release", "runbook"])
        );
        var note = (await retagged.Content.ReadFromJsonAsync<NoteResponse>(JsonOptions.Api))!;
        Assert.Equal(["release", "runbook"], note.Tags);
    }

    [Fact]
    public async Task Diary_entries_of_another_recruit_are_not_readable()
    {
        var (owner, _) = await RecruitAsync("notes-owner@example.com");
        var note = await owner.PostAsJsonAsync(
            "/api/v1/notes",
            new CreateNoteRequest(Today, "Private note", "Only mine.", null)
        );
        var created = (await note.Content.ReadFromJsonAsync<NoteResponse>(JsonOptions.Api))!;

        var (intruder, _) = await RecruitAsync("notes-intruder@example.com");
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await intruder.GetAsync($"/api/v1/notes/{created.Id}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await intruder.DeleteAsync($"/api/v1/notes/{created.Id}")).StatusCode
        );
    }

    [Fact]
    public async Task Manager_reads_the_issues_of_an_assigned_recruit_but_cannot_write()
    {
        var (recruit, recruitId) = await RecruitAsync("issues-managed@example.com");
        await CreateIssueAsync(recruit, "Laptop keeps sleeping");

        var manager = await ManagerAsync("issues-manager@example.com", recruitId);

        var issues = await manager.GetFromJsonAsync<PagedResponse<IssueResponse>>(
            $"/api/v1/issues?userId={recruitId}",
            JsonOptions.Api
        );
        Assert.Equal("Laptop keeps sleeping", Assert.Single(issues!.Items).Title);

        var write = await manager.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(Today, "Manager written issue", null, IssueSeverity.Low)
        );
        Assert.Equal(HttpStatusCode.Forbidden, write.StatusCode);
    }

    [Fact]
    public async Task Dashboard_counts_issues_feedback_and_notes_and_lists_recent_activity()
    {
        var (client, userId) = await RecruitAsync("dashboard-diary@example.com");

        await CreateIssueAsync(client, "Access request pending", IssueSeverity.Critical);
        var resolved = await CreateIssueAsync(client, "Wifi drops", IssueSeverity.Low);
        await client.PatchAsJsonAsync(
            $"/api/v1/issues/{resolved.Id}",
            Move(resolved, IssueStatus.Resolved, "Router replaced.")
        );
        await client.PostAsJsonAsync(
            "/api/v1/feedback",
            new CreateFeedbackRequest(Today, "Great onboarding", "Clear docs.", FeedbackType.Positive)
        );
        await client.PostAsJsonAsync(
            "/api/v1/notes",
            new CreateNoteRequest(Today, "Standup at 9:30", "Daily on Teams.", ["ritual"])
        );

        var dashboard = await client.GetFromJsonAsync<DashboardResponse>(
            "/api/v1/dashboard",
            JsonOptions.Api
        );

        Assert.Equal(userId, dashboard!.UserId);
        Assert.Equal(2, dashboard.Issues.Total);
        Assert.Equal(1, dashboard.Issues.Open);
        Assert.Equal(1, dashboard.Issues.OpenBySeverity[IssueSeverity.Critical]);
        Assert.False(dashboard.Issues.OpenBySeverity.ContainsKey(IssueSeverity.Low));
        Assert.Equal(1, dashboard.FeedbackCount);
        Assert.Equal(1, dashboard.NoteCount);
        Assert.Equal(4, dashboard.RecentActivity.Count);
        Assert.Contains(dashboard.RecentActivity, item => item.Kind == "Note");
        Assert.Contains(dashboard.RecentActivity, item => item.Kind == "Feedback");
    }
}
