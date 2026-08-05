using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Domain;
using TaskStatus = OnboardingDiary.Api.Domain.TaskStatus;

namespace OnboardingDiary.Tests;

public class SearchTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private async Task<HttpClient> SignedInClientAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/signup",
            new SignupRequest(email, "Passw0rd1", "Search User", "Engineering", new DateOnly(2026, 8, 1)));
        var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return client;
    }

    [Fact]
    public async Task Search_matches_entries_across_types_case_insensitively()
    {
        var client = await SignedInClientAsync("search@example.com");
        var date = new DateOnly(2026, 8, 5);
        await client.PostAsJsonAsync("/api/tasks", new TaskEntryRequest(
            date, "VPN setup", null, TaskCategory.Setup, TaskStatus.Completed, TaskPriority.Low));
        await client.PostAsJsonAsync("/api/notes", new NoteRequest(date, "Network tips", "vpn client install steps", null));

        var results = await client.GetFromJsonAsync<List<SearchResult>>("/api/search?q=VPN");

        Assert.Equal(2, results!.Count);
        Assert.Contains(results, r => r.Kind == "Task");
        Assert.Contains(results, r => r.Kind == "Note");
    }

    [Fact]
    public async Task Search_requires_a_term()
    {
        var client = await SignedInClientAsync("search-empty@example.com");

        var response = await client.GetAsync("/api/search?q=");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
