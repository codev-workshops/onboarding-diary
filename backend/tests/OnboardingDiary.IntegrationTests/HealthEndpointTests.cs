using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;

namespace OnboardingDiary.IntegrationTests;

public class HealthEndpointTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Healthz_reports_ok()
    {
        var response = await factory.CreateClient().GetAsync("/healthz");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("ok", body?["status"]);
    }

    [Fact]
    public async Task Startup_migrates_and_seeds_departments()
    {
        _ = factory.CreateClient();

        var departments = await factory.WithDbAsync(db =>
            db.Departments.OrderBy(d => d.Name).Select(d => d.Name).ToListAsync()
        );

        Assert.Contains("Engineering", departments);
        Assert.All(departments, name => Assert.False(string.IsNullOrWhiteSpace(name)));
    }
}
