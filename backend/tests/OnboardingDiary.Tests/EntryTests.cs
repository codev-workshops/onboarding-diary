using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Domain;
using TaskStatus = OnboardingDiary.Api.Domain.TaskStatus;

namespace OnboardingDiary.Tests;

public class EntryTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly DateOnly Today = new(2026, 8, 5);

    private async Task<(HttpClient Client, UserResponse User)> SignupAsync(string email)
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/signup",
            new SignupRequest(email, "Passw0rd1", "Test User", "Engineering", new DateOnly(2026, 8, 1)));
        response.EnsureSuccessStatusCode();
        var body = (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", body.Token);
        return (client, body.User);
    }

    private static TaskEntryRequest NewTask(string title = "Set up laptop") =>
        new(Today, title, "IT setup", TaskCategory.Setup, TaskStatus.InProgress, TaskPriority.High);

    [Fact]
    public async Task Task_crud_roundtrip()
    {
        var (client, user) = await SignupAsync("tasks@example.com");

        var created = await client.PostAsJsonAsync("/api/tasks", NewTask());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var task = (await created.Content.ReadFromJsonAsync<TaskEntryResponse>())!;
        Assert.Equal(user.Id, task.UserId);

        var updated = await client.PutAsJsonAsync($"/api/tasks/{task.Id}",
            NewTask() with { Status = TaskStatus.Completed });
        updated.EnsureSuccessStatusCode();
        Assert.Equal(TaskStatus.Completed, (await updated.Content.ReadFromJsonAsync<TaskEntryResponse>())!.Status);

        var completed = await client.GetFromJsonAsync<List<TaskEntryResponse>>("/api/tasks?status=Completed");
        Assert.Single(completed!);
        var blocked = await client.GetFromJsonAsync<List<TaskEntryResponse>>("/api/tasks?status=Blocked");
        Assert.Empty(blocked!);

        var deleted = await client.DeleteAsync($"/api/tasks/{task.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<List<TaskEntryResponse>>("/api/tasks"))!);
    }

    [Fact]
    public async Task Task_list_is_scoped_to_the_owner()
    {
        var (owner, ownerUser) = await SignupAsync("owner@example.com");
        await owner.PostAsJsonAsync("/api/tasks", NewTask("Owner task"));
        var (other, _) = await SignupAsync("intruder@example.com");

        var ownList = await other.GetFromJsonAsync<List<TaskEntryResponse>>("/api/tasks");
        var foreignList = await other.GetAsync($"/api/tasks?userId={ownerUser.Id}");

        Assert.Empty(ownList!);
        Assert.Equal(HttpStatusCode.Forbidden, foreignList.StatusCode);
    }

    [Fact]
    public async Task Issue_requires_resolution_notes_when_resolved()
    {
        var (client, _) = await SignupAsync("issues@example.com");

        var response = await client.PostAsJsonAsync("/api/issues",
            new IssueEntryRequest(Today, "VPN broken", "Cannot connect", IssueSeverity.High, IssueStatus.Resolved, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Feedback_can_be_created_and_filtered_by_type()
    {
        var (client, _) = await SignupAsync("feedback@example.com");
        await client.PostAsJsonAsync("/api/feedback",
            new FeedbackRequest(Today, "Great buddy system", FeedbackType.Positive, "My buddy was helpful."));

        var positive = await client.GetFromJsonAsync<List<FeedbackResponse>>("/api/feedback?type=Positive");
        var concerns = await client.GetFromJsonAsync<List<FeedbackResponse>>("/api/feedback?type=Concern");

        Assert.Single(positive!);
        Assert.Empty(concerns!);
    }

    [Fact]
    public async Task Notes_normalize_tags_and_support_tag_filtering()
    {
        var (client, _) = await SignupAsync("notes@example.com");
        await client.PostAsJsonAsync("/api/notes",
            new NoteRequest(Today, "Team glossary", "ACL = access control list", ["Glossary", "glossary", "Team"]));

        var note = (await client.GetFromJsonAsync<List<NoteResponse>>("/api/notes"))!.Single();
        var tagged = await client.GetFromJsonAsync<List<NoteResponse>>("/api/notes?tag=glossary");

        Assert.Equal(["glossary", "team"], note.Tags);
        Assert.Single(tagged!);
    }

    [Fact]
    public async Task Manager_can_read_assigned_recruit_entries_but_not_write_them()
    {
        var (recruitClient, recruit) = await SignupAsync("managed-recruit@example.com");
        await recruitClient.PostAsJsonAsync("/api/tasks", NewTask("Recruit task"));

        var (managerClient, manager) = await SignupAsync("manager@example.com");
        await using (var db = factory.CreateDbContext())
        {
            var managerEntity = db.Users.Single(u => u.Id == manager.Id);
            managerEntity.Role = UserRole.Manager;
            var recruitEntity = db.Users.Single(u => u.Id == recruit.Id);
            recruitEntity.ManagerId = manager.Id;
            db.SaveChanges();
        }

        // Re-login so the token carries the Manager role.
        var login = await managerClient.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("manager@example.com", "Passw0rd1"));
        var token = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
        managerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var recruitTasks = await managerClient.GetFromJsonAsync<List<TaskEntryResponse>>($"/api/tasks?userId={recruit.Id}");
        Assert.Single(recruitTasks!);

        var update = await managerClient.PutAsJsonAsync($"/api/tasks/{recruitTasks![0].Id}", NewTask("Hijacked"));
        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
    }
}
