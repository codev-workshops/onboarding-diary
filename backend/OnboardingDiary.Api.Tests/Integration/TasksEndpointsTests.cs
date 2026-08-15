using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Tests.Integration;

public class TasksEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public TasksEndpointsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static SaveTaskRequest NewTask(string title) => new()
    {
        Date = DateTime.UtcNow.Date,
        Title = title,
        Description = "Set up the development environment.",
        Category = TaskCategory.Setup,
        Status = TaskEntryStatus.InProgress,
        Priority = TaskPriority.Medium
    };

    [Fact]
    public async Task Recruit_CanRunTheFullCrudCycleOnTheirOwnTasks()
    {
        var (client, _) = await _factory.CreateRecruitClientAsync($"crud-{Guid.NewGuid():N}@onboarding.local");

        var created = await client.PostAsJsonAsync("/api/tasks", NewTask("Install the SDK"));
        created.StatusCode.Should().Be(HttpStatusCode.Created);
        var task = await created.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.JsonOptions);

        var list = await client.GetFromJsonAsync<PagedResult<TaskDto>>("/api/tasks", ApiFactory.JsonOptions);
        list!.Total.Should().Be(1);
        list.Items.Should().ContainSingle(item => item.Title == "Install the SDK");

        var updateRequest = NewTask("Install the SDK and the CLI");
        updateRequest.Status = TaskEntryStatus.Completed;
        var updated = await client.PutAsJsonAsync($"/api/tasks/{task!.Id}", updateRequest);
        updated.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedTask = await updated.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.JsonOptions);
        updatedTask!.Status.Should().Be(TaskEntryStatus.Completed);

        var deleted = await client.DeleteAsync(new Uri($"/api/tasks/{task.Id}", UriKind.Relative));
        deleted.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var afterDelete = await client.GetAsync(new Uri($"/api/tasks/{task.Id}", UriKind.Relative));
        afterDelete.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Recruit_CannotReadAnotherRecruitsTasks()
    {
        var (ownerClient, owner) = await _factory.CreateRecruitClientAsync($"owner-{Guid.NewGuid():N}@onboarding.local");
        (await ownerClient.PostAsJsonAsync("/api/tasks", NewTask("Private task"))).EnsureSuccessStatusCode();

        var (snooperClient, _) = await _factory.CreateRecruitClientAsync($"snoop-{Guid.NewGuid():N}@onboarding.local");

        var response = await snooperClient.GetAsync(new Uri($"/api/tasks?recruitId={owner.Id}", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Admin_CanReadAnyRecruitsTasks()
    {
        var (ownerClient, owner) = await _factory.CreateRecruitClientAsync($"seen-{Guid.NewGuid():N}@onboarding.local");
        (await ownerClient.PostAsJsonAsync("/api/tasks", NewTask("Visible to admin"))).EnsureSuccessStatusCode();

        var adminClient = await _factory.CreateAdminClientAsync();

        var list = await adminClient.GetFromJsonAsync<PagedResult<TaskDto>>(
            $"/api/tasks?recruitId={owner.Id}",
            ApiFactory.JsonOptions);

        list!.Items.Should().ContainSingle(item => item.Title == "Visible to admin");
    }

    [Fact]
    public async Task Create_RejectsAnEmptyTitle()
    {
        var (client, _) = await _factory.CreateRecruitClientAsync($"invalid-{Guid.NewGuid():N}@onboarding.local");

        var request = NewTask(string.Empty);
        var response = await client.PostAsJsonAsync("/api/tasks", request);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(ApiFactory.JsonOptions);
        error!.Error.Code.Should().Be("validation_error");
    }
}
