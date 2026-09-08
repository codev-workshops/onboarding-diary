using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Features.Reports;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.IntegrationTests;

public class ReportEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
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

    /// <summary>Fills a recruit's diary with one entry of every kind, all dated today.</summary>
    private static async Task SeedDiaryAsync(HttpClient recruit)
    {
        await recruit.PostAsJsonAsync(
            "/api/v1/tasks",
            new CreateTaskRequest(
                Today,
                "Read the handbook",
                "Went through the onboarding handbook end to end.",
                TaskCategory.Training,
                TaskEntryStatus.Done,
                TaskPriority.High
            )
        );
        await recruit.PostAsJsonAsync(
            "/api/v1/issues",
            new CreateIssueRequest(
                Today,
                "VPN will not connect",
                "The client times out on the second factor.",
                IssueSeverity.High
            )
        );
        await recruit.PostAsJsonAsync(
            "/api/v1/feedback",
            new CreateFeedbackRequest(
                Today,
                "Great buddy system",
                "My buddy answered every question on day one.",
                FeedbackType.Positive
            )
        );
        await recruit.PostAsJsonAsync(
            "/api/v1/notes",
            new CreateNoteRequest(Today, "Auth notes", "OAuth handshake details", ["auth"])
        );
    }

    [Fact]
    public async Task Recruit_preview_returns_their_own_entries_with_full_bodies()
    {
        var (recruit, recruitId) = await RecruitAsync("report-own@example.com");
        await SeedDiaryAsync(recruit);

        var report = (
            await recruit.GetFromJsonAsync<ReportResponse>("/api/v1/reports/preview", JsonOptions.Api)
        )!;

        Assert.Equal(recruitId, report.Header.UserId);
        Assert.Equal(4, report.Sections.Count);
        Assert.Equal(1, report.Summary.TotalTasks);
        Assert.Equal(1, report.Summary.CompletedTasks);
        Assert.Equal(1, report.Summary.OpenIssues);
        Assert.Equal(0, report.Summary.ResolvedIssues);
        Assert.Equal(1, report.Summary.FeedbackCount);
        Assert.Equal(1, report.Summary.NoteCount);
        Assert.Equal(
            "Went through the onboarding handbook end to end.",
            Assert.Single(report.Tasks).Description
        );
        Assert.Equal(
            "The client times out on the second factor.",
            Assert.Single(report.Issues).Description
        );
        Assert.Equal(
            "My buddy answered every question on day one.",
            Assert.Single(report.Feedback).Message
        );
        Assert.Equal("OAuth handshake details", Assert.Single(report.Notes).Content);
    }

    [Fact]
    public async Task Preview_honours_the_requested_sections_and_date_range()
    {
        var (recruit, _) = await RecruitAsync("report-sections@example.com");
        await SeedDiaryAsync(recruit);

        var sections = (
            await recruit.GetFromJsonAsync<ReportResponse>(
                "/api/v1/reports/preview?sections=Tasks&sections=Notes",
                JsonOptions.Api
            )
        )!;

        Assert.Equal([ReportSection.Tasks, ReportSection.Notes], sections.Sections);
        Assert.Single(sections.Tasks);
        Assert.Empty(sections.Issues);
        Assert.Empty(sections.Feedback);
        Assert.Single(sections.Notes);

        var range = (
            await recruit.GetFromJsonAsync<ReportResponse>(
                $"/api/v1/reports/preview?from={Today.AddDays(-9):yyyy-MM-dd}&to={Today.AddDays(-8):yyyy-MM-dd}",
                JsonOptions.Api
            )
        )!;

        Assert.Empty(range.Tasks);
        Assert.Empty(range.Notes);
        Assert.Equal(0, range.Summary.TotalTasks);
    }

    [Fact]
    public async Task Preview_rejects_an_inverted_or_oversized_range()
    {
        var (recruit, _) = await RecruitAsync("report-range@example.com");

        var inverted = await recruit.GetAsync(
            $"/api/v1/reports/preview?from={Today:yyyy-MM-dd}&to={Today.AddDays(-1):yyyy-MM-dd}"
        );
        Assert.Equal(HttpStatusCode.BadRequest, inverted.StatusCode);

        var oversized = await recruit.GetAsync(
            $"/api/v1/reports/preview?from={Today.AddDays(-400):yyyy-MM-dd}&to={Today:yyyy-MM-dd}"
        );
        Assert.Equal(HttpStatusCode.BadRequest, oversized.StatusCode);
    }

    [Fact]
    public async Task Report_scope_matches_the_diary_scope_for_every_role()
    {
        var (recruit, recruitId) = await RecruitAsync("report-scope@example.com");
        var (other, otherId) = await RecruitAsync("report-scope-other@example.com");
        var (manager, managerId) = await PromotedAsync(
            "report-scope-manager@example.com",
            UserRole.Manager
        );
        var (unassignedManager, _) = await PromotedAsync(
            "report-scope-manager-2@example.com",
            UserRole.Manager
        );
        var (admin, _) = await PromotedAsync("report-scope-admin@example.com", UserRole.Admin);
        await AssignAsync(recruitId, managerId);
        await SeedDiaryAsync(recruit);

        Assert.Equal(
            HttpStatusCode.NotFound,
            (await other.GetAsync($"/api/v1/reports/preview?userId={recruitId}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (
                await unassignedManager.GetAsync($"/api/v1/reports/preview?userId={recruitId}")
            ).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await manager.GetAsync($"/api/v1/reports/preview?userId={otherId}")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await manager.GetAsync("/api/v1/reports/preview")).StatusCode
        );

        var assigned = (
            await manager.GetFromJsonAsync<ReportResponse>(
                $"/api/v1/reports/preview?userId={recruitId}",
                JsonOptions.Api
            )
        )!;
        Assert.Equal(recruitId, assigned.Header.UserId);

        var byAdmin = (
            await admin.GetFromJsonAsync<ReportResponse>(
                $"/api/v1/reports/preview?userId={recruitId}",
                JsonOptions.Api
            )
        )!;
        Assert.Single(byAdmin.Tasks);

        var anonymous = factory.CreateClient();
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/v1/reports/preview")).StatusCode
        );
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await anonymous.GetAsync("/api/v1/reports/download")).StatusCode
        );
    }

    [Fact]
    public async Task Csv_download_contains_every_section_and_the_full_bodies()
    {
        var (recruit, _) = await RecruitAsync("report-csv@example.com");
        await SeedDiaryAsync(recruit);

        var response = await recruit.GetAsync("/api/v1/reports/download?format=Csv");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains(".csv", response.Content.Headers.ContentDisposition?.FileName);

        var csv = Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync());
        var lines = csv.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(
            "Section,Date,Title,Category,Priority,Status,Severity,Type,Tags,Body,Resolution Notes",
            lines[0].TrimEnd('\r')
        );
        Assert.Equal(5, lines.Length);
        Assert.Contains(
            $"Tasks,{Today:yyyy-MM-dd},Read the handbook,Training,High,Done,,,,Went through the onboarding handbook end to end.,",
            csv
        );
        Assert.Contains(
            $"Issues,{Today:yyyy-MM-dd},VPN will not connect,,,Open,High,,,The client times out on the second factor.,",
            csv
        );
        Assert.Contains(
            $"Feedback,{Today:yyyy-MM-dd},Great buddy system,,,,,Positive,,My buddy answered every question on day one.,",
            csv
        );
        Assert.Contains(
            $"Notes,{Today:yyyy-MM-dd},Auth notes,,,,,,auth,OAuth handshake details,",
            csv
        );
    }

    [Fact]
    public async Task Pdf_download_returns_a_pdf_named_after_the_recruit_and_range()
    {
        var (recruit, _) = await RecruitAsync("report-pdf@example.com");
        await SeedDiaryAsync(recruit);

        var response = await recruit.GetAsync(
            $"/api/v1/reports/download?format=Pdf&from={Today.AddDays(-7):yyyy-MM-dd}&to={Today:yyyy-MM-dd}"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(
            $"recruit-report-pdf-example-com-{Today.AddDays(-7):yyyy-MM-dd}-{Today:yyyy-MM-dd}.pdf",
            response.Content.Headers.ContentDisposition?.FileName?.Trim('"')
        );

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 1000);
        Assert.Equal("%PDF", Encoding.ASCII.GetString(bytes, 0, 4));
    }
}
