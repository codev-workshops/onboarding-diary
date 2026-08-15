using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Tests.Integration;

public class DashboardEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public DashboardEndpointsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Summary_IncludesJourneyAndChecklistForTheCaller()
    {
        var (client, _) = await _factory.CreateRecruitClientAsync($"journey-{Guid.NewGuid():N}@onboarding.local");
        (await client.PostAsJsonAsync("/api/tasks", new SaveTaskRequest
        {
            Date = DateTime.UtcNow.Date,
            Title = "Set up the laptop",
            Category = TaskCategory.Setup,
            Status = TaskEntryStatus.Completed,
            Priority = TaskPriority.Medium
        })).EnsureSuccessStatusCode();

        var summary = await client.GetFromJsonAsync<DashboardSummaryDto>(
            "/api/dashboard/summary",
            ApiFactory.JsonOptions);

        summary!.Journey.Stages.Should().ContainSingle().Which.Key.Should().Be("Setup");
        summary.Checklist.Total.Should().Be(1);
        summary.Checklist.ProgressPercent.Should().Be(100);
        summary.Checklist.Items.Should().ContainSingle(item => item.State == "Completed");
    }

    [Fact]
    public async Task ManagerDashboard_IsForbiddenForARecruit()
    {
        var (client, _) = await _factory.CreateRecruitClientAsync($"nomgr-{Guid.NewGuid():N}@onboarding.local");

        var response = await client.GetAsync(new Uri("/api/dashboard/manager", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminDashboard_IsForbiddenForARecruit()
    {
        var (client, _) = await _factory.CreateRecruitClientAsync($"noadm-{Guid.NewGuid():N}@onboarding.local");

        var response = await client.GetAsync(new Uri("/api/dashboard/admin", UriKind.Relative));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminDashboard_ReturnsOrgWideAggregates()
    {
        await _factory.CreateRecruitClientAsync($"orgwide-{Guid.NewGuid():N}@onboarding.local");
        var adminClient = await _factory.CreateAdminClientAsync();

        var dashboard = await adminClient.GetFromJsonAsync<AdminDashboardDto>(
            "/api/dashboard/admin",
            ApiFactory.JsonOptions);

        dashboard!.UserCount.Should().BeGreaterThan(0);
        dashboard.UsersByRole.Should().Contain(entry => entry.Label == "Admin" && entry.Count >= 1);
        dashboard.ActivityByWeek.Should().HaveCount(8);
    }
}
