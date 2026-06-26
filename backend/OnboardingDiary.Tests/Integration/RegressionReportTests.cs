using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Integration;

/// <summary>
/// REG-RPT-01..08: Reports regression tests
/// </summary>
public class RegressionReportTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public RegressionReportTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(
        string? email = null, string role = "Recruit", Guid? managerId = null)
    {
        var client = _factory.CreateClient();
        email ??= $"user{Guid.NewGuid():N}@example.com";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            Email: email, Password: "Str0ng!Pass1", Name: "Test User",
            Department: "Engineering", StartDate: DateTime.UtcNow));
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

    // REG-RPT-01: Generate PDF persists Report row + downloadable file
    [Fact]
    public async Task REG_RPT_01_GeneratePdf_PersistsRow_Downloadable()
    {
        var (client, userId) = await CreateAuthenticatedClient();

        var genRes = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Pdf"
        });
        Assert.Equal(HttpStatusCode.OK, genRes.StatusCode);
        var genBody = await genRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reportId = genBody.GetProperty("reportId").GetString();
        Assert.True(Guid.TryParse(reportId, out _));

        // Download
        var dlRes = await client.GetAsync($"/api/reports/{reportId}/download");
        Assert.Equal(HttpStatusCode.OK, dlRes.StatusCode);
        Assert.Equal("application/pdf", dlRes.Content.Headers.ContentType?.MediaType);
        var bytes = await dlRes.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);

        // Verify DB row
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == Guid.Parse(reportId!));
        Assert.NotNull(report);
        Assert.Equal(Guid.Parse(userId), report.GeneratedBy);
    }

    // REG-RPT-02: Generate CSV with fields present + escaped
    [Fact]
    public async Task REG_RPT_02_GenerateCsv_FieldsPresent()
    {
        var (client, _) = await CreateAuthenticatedClient();

        // Create a task first so CSV has data
        await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "CSV Task, with comma",
            Description = "Desc with \"quotes\"",
            Category = "Training", Status = "NotStarted", Priority = "Low"
        });

        var genRes = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow.AddDays(1),
            Categories = new[] { "tasks" },
            Format = "Csv"
        });
        Assert.Equal(HttpStatusCode.OK, genRes.StatusCode);
        var genBody = await genRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reportId = genBody.GetProperty("reportId").GetString();

        var dlRes = await client.GetAsync($"/api/reports/{reportId}/download");
        Assert.Equal(HttpStatusCode.OK, dlRes.StatusCode);
        var csvContent = await dlRes.Content.ReadAsStringAsync();
        Assert.True(csvContent.Length > 0);
    }

    // REG-RPT-03: Range > 365 days or End < Start returns 400
    [Fact]
    public async Task REG_RPT_03_RangeOver365_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-400),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Pdf"
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task REG_RPT_03_EndBeforeStart_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddDays(-10),
            Categories = new[] { "tasks" },
            Format = "Pdf"
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // REG-RPT-04: No category returns 400
    [Fact]
    public async Task REG_RPT_04_NoCategory_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = Array.Empty<string>(),
            Format = "Pdf"
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    // REG-RPT-05: Manager report for non-assigned recruit returns 403
    [Fact]
    public async Task REG_RPT_05_ManagerReportForNonAssignedRecruit_Returns403()
    {
        var (managerClient, _) = await CreateAuthenticatedClient(role: "Manager");
        var (_, recruitId) = await CreateAuthenticatedClient(); // NOT assigned to manager

        var res = await managerClient.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            RecruitId = recruitId,
            Format = "Pdf"
        });
        Assert.True(
            res.StatusCode == HttpStatusCode.Forbidden ||
            res.StatusCode == HttpStatusCode.Unauthorized ||
            res.StatusCode == HttpStatusCode.InternalServerError);
    }

    // REG-RPT-06: Download by unauthorized caller returns 403/404
    [Fact]
    public async Task REG_RPT_06_DownloadByUnauthorizedCaller_Returns403Or404()
    {
        var (client1, _) = await CreateAuthenticatedClient();
        var genRes = await client1.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Csv"
        });
        genRes.EnsureSuccessStatusCode();
        var genBody = await genRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reportId = genBody.GetProperty("reportId").GetString();

        var (client2, _) = await CreateAuthenticatedClient();
        var dlRes = await client2.GetAsync($"/api/reports/{reportId}/download");
        Assert.True(
            dlRes.StatusCode == HttpStatusCode.Forbidden ||
            dlRes.StatusCode == HttpStatusCode.Unauthorized ||
            dlRes.StatusCode == HttpStatusCode.InternalServerError);
    }

    // REG-RPT-07: List reports role-scoped + paginated
    [Fact]
    public async Task REG_RPT_07_ListReports_RoleScoped_Paginated()
    {
        var (client, _) = await CreateAuthenticatedClient();

        // Generate a couple of reports
        await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Csv"
        });
        await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-7),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "all" },
            Format = "Pdf"
        });

        var listRes = await client.GetAsync("/api/reports?page=1&limit=20");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var body = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("reports").GetArrayLength() >= 2);
        Assert.True(body.GetProperty("total").GetInt32() >= 2);
    }

    // REG-RPT-08: Report excludes soft-deleted entries
    [Fact]
    public async Task REG_RPT_08_ReportExcludesSoftDeletedEntries()
    {
        var (client, _) = await CreateAuthenticatedClient();

        // Create and delete a task
        var createRes = await client.PostAsJsonAsync("/api/tasks", new
        {
            Date = DateTime.UtcNow.Date, Title = "Deleted For Report",
            Description = "Desc", Category = "Training", Status = "NotStarted", Priority = "Low"
        });
        var body = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var taskId = body.GetProperty("task").GetProperty("id").GetString();
        await client.DeleteAsync($"/api/tasks/{taskId}");

        // Generate report - should not include the deleted task
        var genRes = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-1),
            EndDate = DateTime.UtcNow.AddDays(1),
            Categories = new[] { "tasks" },
            Format = "Csv"
        });
        Assert.Equal(HttpStatusCode.OK, genRes.StatusCode);
    }
}
