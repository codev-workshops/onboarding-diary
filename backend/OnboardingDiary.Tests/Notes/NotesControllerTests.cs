using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth.Dtos;
using OnboardingDiary.Application.Notes.Dtos;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Tests.Integration;

namespace OnboardingDiary.Tests.Notes;

public class NotesControllerTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public NotesControllerTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient client, string userId)> CreateAuthenticatedClient(string? email = null)
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

        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "Str0ng!Pass1"));
        loginRes.EnsureSuccessStatusCode();
        var loginBody = await loginRes.Content.ReadFromJsonAsync<LoginResponse>(JsonOpts);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody!.AccessToken);

        return (client, regBody!.UserId.ToString());
    }

    private static object ValidNote(string title = "Test Note") => new
    {
        Date = DateTime.UtcNow.Date,
        Title = title,
        Content = "Some markdown content",
        Tags = new[] { "onboarding", "day-1" },
        IsPinned = false,
    };

    [Fact]
    public async Task Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/notes");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Create_Returns201()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/notes", ValidNote());
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.TryGetProperty("note", out var note));
        Assert.Equal("Test Note", note.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Create_InvalidTitle_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "ab",
            Content = "Content",
            Tags = Array.Empty<string>(),
            IsPinned = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task CRUD_FullRoundTrip()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/notes", ValidNote("Round Trip Note"));
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteId = createBody.GetProperty("note").GetProperty("id").GetString();

        var getRes = await client.GetAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var getBody = await getRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Round Trip Note", getBody.GetProperty("note").GetProperty("title").GetString());

        var updateRes = await client.PutAsJsonAsync($"/api/notes/{noteId}", new
        {
            Title = "Updated Note Title",
            Content = "Updated content",
            Tags = new[] { "updated" },
            IsPinned = true,
        });
        Assert.Equal(HttpStatusCode.OK, updateRes.StatusCode);
        var updateBody = await updateRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Updated Note Title", updateBody.GetProperty("note").GetProperty("title").GetString());

        var deleteRes = await client.DeleteAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

        var getAfterDelete = await client.GetAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.NotFound, getAfterDelete.StatusCode);
    }

    [Fact]
    public async Task SoftDeletedNotes_ExcludedFromList()
    {
        var (client, _) = await CreateAuthenticatedClient();

        var createRes = await client.PostAsJsonAsync("/api/notes", ValidNote("Soft Delete Note"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteId = createBody.GetProperty("note").GetProperty("id").GetString();

        await client.DeleteAsync($"/api/notes/{noteId}");

        var listRes = await client.GetAsync("/api/notes?limit=100");
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteIds = new List<string>();
        foreach (var n in listBody.GetProperty("notes").EnumerateArray())
            noteIds.Add(n.GetProperty("id").GetString()!);

        Assert.DoesNotContain(noteId, noteIds);
    }

    [Fact]
    public async Task Search_MatchesTitleAndContent()
    {
        var (client, _) = await CreateAuthenticatedClient();

        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Unique Search Title XYZ",
            Content = "Generic content",
            Tags = Array.Empty<string>(),
            IsPinned = false,
        });

        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Another Note",
            Content = "Contains the search term XYZ here",
            Tags = Array.Empty<string>(),
            IsPinned = false,
        });

        var searchRes = await client.GetAsync("/api/notes?search=XYZ&limit=100");
        var searchBody = await searchRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var count = searchBody.GetProperty("notes").GetArrayLength();
        Assert.True(count >= 2);
    }

    [Fact]
    public async Task PinnedNotes_OrderedFirst()
    {
        var (client, _) = await CreateAuthenticatedClient();

        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Unpinned Order Test",
            Content = "Content",
            Tags = Array.Empty<string>(),
            IsPinned = false,
        });

        await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Pinned Order Test",
            Content = "Content",
            Tags = Array.Empty<string>(),
            IsPinned = true,
        });

        var listRes = await client.GetAsync("/api/notes?limit=100");
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var notes = listBody.GetProperty("notes").EnumerateArray().ToList();

        Assert.True(notes.Count >= 2);
        var pinnedIdx = notes.FindIndex(n => n.GetProperty("title").GetString() == "Pinned Order Test");
        var unpinnedIdx = notes.FindIndex(n => n.GetProperty("title").GetString() == "Unpinned Order Test");
        Assert.True(pinnedIdx < unpinnedIdx, "Pinned note should appear before unpinned");
    }

    [Fact]
    public async Task SixthPinAttempt_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();

        for (int i = 0; i < 5; i++)
        {
            var res = await client.PostAsJsonAsync("/api/notes", new
            {
                Date = DateTime.UtcNow.Date,
                Title = $"Pinned Note {i}",
                Content = "Content",
                Tags = Array.Empty<string>(),
                IsPinned = true,
            });
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        var sixthRes = await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Pinned Note 6",
            Content = "Content",
            Tags = Array.Empty<string>(),
            IsPinned = true,
        });
        Assert.Equal(HttpStatusCode.BadRequest, sixthRes.StatusCode);
    }

    [Fact]
    public async Task UserCannotAccessAnotherUsersNote()
    {
        var (client1, _) = await CreateAuthenticatedClient();
        var (client2, _) = await CreateAuthenticatedClient();

        var createRes = await client1.PostAsJsonAsync("/api/notes", ValidNote("Private Note"));
        var createBody = await createRes.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var noteId = createBody.GetProperty("note").GetProperty("id").GetString();

        var getRes = await client2.GetAsync($"/api/notes/{noteId}");
        Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);
    }

    [Fact]
    public async Task List_PaginationWorks()
    {
        var (client, _) = await CreateAuthenticatedClient();

        for (int i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/notes", new
            {
                Date = DateTime.UtcNow.Date,
                Title = $"Pag Note {i}",
                Content = "Content",
                Tags = Array.Empty<string>(),
                IsPinned = false,
            });
        }

        var page1Res = await client.GetAsync("/api/notes?page=1&limit=2");
        var page1Body = await page1Res.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(2, page1Body.GetProperty("notes").GetArrayLength());
        Assert.True(page1Body.GetProperty("totalPages").GetInt32() >= 2);
    }

    [Fact]
    public async Task Create_EmptyContent_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Valid Title",
            Content = "",
            Tags = Array.Empty<string>(),
            IsPinned = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidTags_Returns400()
    {
        var (client, _) = await CreateAuthenticatedClient();
        var res = await client.PostAsJsonAsync("/api/notes", new
        {
            Date = DateTime.UtcNow.Date,
            Title = "Valid Title",
            Content = "Content",
            Tags = new[] { "invalid tag!" },
            IsPinned = false,
        });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }
}
