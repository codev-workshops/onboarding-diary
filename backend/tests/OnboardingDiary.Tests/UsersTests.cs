using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Tests;

public class UsersTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static async Task<(HttpClient Client, UserResponse User)> SignupAsync(ApiFactory factory, string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/signup",
            new SignupRequest(email, "Passw0rd1", "Test User", "Engineering", new DateOnly(2026, 8, 1)));
        response.EnsureSuccessStatusCode();
        var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return (client, body.User);
    }

    [Fact]
    public async Task Recruit_cannot_list_users()
    {
        var (client, _) = await SignupAsync(factory, "list-forbidden@example.com");

        var response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task User_can_update_own_profile_but_not_role()
    {
        var (client, user) = await SignupAsync(factory, "profile@example.com");

        var response = await client.PutAsJsonAsync("/api/users/me",
            new UpdateProfileRequest("Updated Name", "Support", new DateOnly(2026, 8, 3)));
        response.EnsureSuccessStatusCode();
        var updated = (await response.Content.ReadFromJsonAsync<UserResponse>())!;

        Assert.Equal("Updated Name", updated.FullName);
        Assert.Equal(UserRole.NewRecruit, updated.Role);
        Assert.Equal(user.Id, updated.Id);
    }

    [Fact]
    public async Task Recruit_cannot_read_another_users_profile()
    {
        var (_, other) = await SignupAsync(factory, "other@example.com");
        var (client, _) = await SignupAsync(factory, "snooper@example.com");

        var response = await client.GetAsync($"/api/users/{other.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
