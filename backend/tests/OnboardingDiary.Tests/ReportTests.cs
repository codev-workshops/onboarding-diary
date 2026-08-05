using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Domain;
using TaskStatus = OnboardingDiary.Api.Domain.TaskStatus;

namespace OnboardingDiary.Tests;

public class ReportTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<HttpClient> SignedInClientAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/signup",
            new SignupRequest(email, "Passw0rd1", "Report User", "Engineering", new DateOnly(2026, 8, 1)));
        var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return client;
    }

    [Fact]
    public async Task Csv_report_contains_logged_entries()
    {
        var client = await SignedInClientAsync("csv@example.com");
        await client.PostAsJsonAsync("/api/tasks", new TaskEntryRequest(
            new DateOnly(2026, 8, 5), "Read handbook", null, TaskCategory.Training, TaskStatus.Completed, TaskPriority.Low));

        var response = await client.GetAsync("/api/reports/diary.csv");
        var csv = Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync());

        response.EnsureSuccessStatusCode();
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Read handbook", csv);
    }

    [Fact]
    public async Task Pdf_report_is_generated()
    {
        var client = await SignedInClientAsync("pdf@example.com");

        var response = await client.GetAsync("/api/reports/diary.pdf");
        var bytes = await response.Content.ReadAsByteArrayAsync();

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/pdf", response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("%PDF", Encoding.ASCII.GetString(bytes, 0, 4));
    }
}
