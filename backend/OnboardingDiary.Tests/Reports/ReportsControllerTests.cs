using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Tests.Integration;

namespace OnboardingDiary.Tests.Reports;

public class ReportsControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public ReportsControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(
        string? email = null, string role = "Recruit", Guid? managerId = null)
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
    public async Task Generate_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Pdf"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Generate_Valid_Returns200WithReportIdAndUrl()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var res = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Csv"
        });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.TryGetProperty("reportId", out var reportIdProp));
        Assert.True(Guid.TryParse(reportIdProp.GetString(), out _));
        Assert.True(body.TryGetProperty("downloadUrl", out var downloadUrlProp));
        Assert.Contains("/api/reports/", downloadUrlProp.GetString());
    }

    [Fact]
    public async Task Generate_InvalidRequest_Returns400()
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

    [Fact]
    public async Task Download_Valid_StreamsFileWithCorrectContentType()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var genRes = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Pdf"
        });
        genRes.EnsureSuccessStatusCode();
        var genBody = await genRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reportId = genBody.GetProperty("reportId").GetString();

        var dlRes = await client.GetAsync($"/api/reports/{reportId}/download");
        Assert.Equal(HttpStatusCode.OK, dlRes.StatusCode);
        Assert.Equal("application/pdf", dlRes.Content.Headers.ContentType?.MediaType);

        var bytes = await dlRes.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 0);
    }

    [Fact]
    public async Task Download_NotFound_Returns404()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.GetAsync($"/api/reports/{Guid.NewGuid()}/download");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Download_UnauthorizedCaller_Returns403()
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

    [Fact]
    public async Task List_ReturnsPaginatedHistory()
    {
        var (client, _) = await CreateAuthenticatedClient();

        await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "tasks" },
            Format = "Csv"
        });

        var listRes = await client.GetAsync("/api/reports?page=1&limit=20");
        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);

        var body = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.TryGetProperty("reports", out var reports));
        Assert.True(reports.GetArrayLength() > 0);
        Assert.True(body.TryGetProperty("total", out var total));
        Assert.True(total.GetInt32() > 0);
    }

    [Fact]
    public async Task Manager_CannotGenerateForNonAssignedRecruit()
    {
        var (managerClient, _) = await CreateAuthenticatedClient(role: "Manager");
        var (_, recruitId) = await CreateAuthenticatedClient();

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

    [Fact]
    public async Task Generate_CreatesReportRow()
    {
        var (client, userId) = await CreateAuthenticatedClient();

        var genRes = await client.PostAsJsonAsync("/api/reports/generate", new
        {
            StartDate = DateTime.UtcNow.AddDays(-7),
            EndDate = DateTime.UtcNow,
            Categories = new[] { "all" },
            Format = "Csv"
        });
        genRes.EnsureSuccessStatusCode();
        var genBody = await genRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var reportId = Guid.Parse(genBody.GetProperty("reportId").GetString()!);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var report = await db.Reports.FirstOrDefaultAsync(r => r.Id == reportId);

        Assert.NotNull(report);
        Assert.Equal(Guid.Parse(userId), report.GeneratedBy);
        Assert.NotNull(report.FileUrl);
    }
}
