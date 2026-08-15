using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Models;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Tests.Unit;

public class DashboardServiceTests : IAsyncLifetime
{
    private const int ManagerId = 1;
    private const int RecruitId = 2;
    private const int OtherRecruitId = 3;
    private const int AdminId = 4;

    private static readonly DateTime StartDate = DateTime.UtcNow.ToUtcDate().AddDays(-30);

    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();

        _db.Users.AddRange(
            new User { Id = ManagerId, Email = "manager@x.io", FullName = "Manny Manager", Role = UserRole.Manager, Department = "Engineering" },
            new User { Id = RecruitId, Email = "recruit@x.io", FullName = "Rita Recruit", Role = UserRole.NewRecruit, ManagerId = ManagerId, Department = "Engineering", StartDate = StartDate },
            new User { Id = OtherRecruitId, Email = "other@x.io", FullName = "Otto Other", Role = UserRole.NewRecruit, Department = "Support", StartDate = StartDate },
            new User { Id = AdminId, Email = "admin@x.io", FullName = "Ada Admin", Role = UserRole.Admin });

        _db.Tasks.AddRange(
            NewTask(RecruitId, TaskCategory.Setup, TaskEntryStatus.Completed, StartDate.AddDays(1)),
            NewTask(RecruitId, TaskCategory.Setup, TaskEntryStatus.Completed, StartDate.AddDays(2)),
            NewTask(RecruitId, TaskCategory.Training, TaskEntryStatus.InProgress, StartDate.AddDays(5)),
            NewTask(RecruitId, TaskCategory.Training, TaskEntryStatus.Blocked, StartDate.AddDays(6)),
            NewTask(RecruitId, TaskCategory.Development, TaskEntryStatus.NotStarted, StartDate.AddDays(10)),
            NewTask(OtherRecruitId, TaskCategory.Setup, TaskEntryStatus.Completed, StartDate.AddDays(3)));

        _db.Issues.AddRange(
            new IssueEntry { UserId = RecruitId, Title = "VPN down", Date = StartDate.AddDays(4), Severity = IssueSeverity.Critical, Status = IssueStatus.Open },
            new IssueEntry { UserId = RecruitId, Title = "Slow laptop", Date = StartDate.AddDays(5), Severity = IssueSeverity.Low, Status = IssueStatus.InProgress },
            new IssueEntry { UserId = RecruitId, Title = "Fixed", Date = StartDate.AddDays(6), Severity = IssueSeverity.High, Status = IssueStatus.Resolved },
            new IssueEntry { UserId = OtherRecruitId, Title = "Badge", Date = StartDate.AddDays(2), Severity = IssueSeverity.Medium, Status = IssueStatus.Open });

        _db.Feedback.AddRange(
            new FeedbackNote { UserId = RecruitId, Subject = "Great onboarding", Date = StartDate.AddDays(7), Type = FeedbackType.Positive },
            new FeedbackNote { UserId = RecruitId, Subject = "More docs", Date = StartDate.AddDays(8), Type = FeedbackType.Suggestion },
            new FeedbackNote { UserId = OtherRecruitId, Subject = "Unclear ownership", Date = StartDate.AddDays(9), Type = FeedbackType.Concern });

        _db.Notes.Add(new AdditionalNote { UserId = RecruitId, Title = "Glossary", Date = StartDate.AddDays(3) });

        await _db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private static TaskEntry NewTask(int userId, TaskCategory category, TaskEntryStatus status, DateTime date) =>
        new() { UserId = userId, Title = $"{category} {status}", Category = category, Status = status, Date = date };

    private DashboardService ServiceFor(int userId, UserRole role)
    {
        var currentUser = new StubCurrentUser(userId, role);
        return new DashboardService(_db, new AccessService(_db, currentUser), currentUser);
    }

    [Fact]
    public async Task SummaryBuildsJourneyStagesOrderedFromTheStartDate()
    {
        var summary = await ServiceFor(RecruitId, UserRole.NewRecruit).GetSummaryAsync(null);

        summary.StartDate.Should().Be(StartDate);
        summary.Journey.Stages.Select(stage => stage.Key).Should().Equal("Setup", "Training", "Development");

        var setup = summary.Journey.Stages[0];
        setup.DayOffset.Should().Be(1);
        setup.CompletionPercent.Should().Be(100);
        setup.Status.Should().Be("Completed");

        var training = summary.Journey.Stages[1];
        training.Status.Should().Be("Blocked");
        training.Blocked.Should().Be(1);

        summary.Journey.Stages[2].Status.Should().Be("NotStarted");
    }

    [Fact]
    public async Task SummaryChecklistGroupsTasksByState()
    {
        var summary = await ServiceFor(RecruitId, UserRole.NewRecruit).GetSummaryAsync(null);

        summary.Checklist.Total.Should().Be(5);
        summary.Checklist.Completed.Should().Be(2);
        summary.Checklist.InProgress.Should().Be(2);
        summary.Checklist.Pending.Should().Be(1);
        summary.Checklist.ProgressPercent.Should().Be(40);
        summary.Checklist.Items.Should().HaveCount(5);
        summary.Checklist.Items.Should().ContainSingle(item => item.IsBlocked && item.State == "InProgress");
    }

    [Fact]
    public async Task SummaryHasEmptyJourneyWhenTheRecruitHasNoTasks()
    {
        var summary = await ServiceFor(AdminId, UserRole.Admin).GetSummaryAsync(null);

        summary.Journey.Stages.Should().BeEmpty();
        summary.Checklist.Total.Should().Be(0);
        summary.Checklist.ProgressPercent.Should().Be(0);
    }

    [Fact]
    public async Task ManagerDashboardOnlyCoversOverseenRecruits()
    {
        var dashboard = await ServiceFor(ManagerId, UserRole.Manager).GetManagerDashboardAsync();

        dashboard.RecruitCount.Should().Be(1);
        dashboard.Recruits.Should().ContainSingle().Which.RecruitId.Should().Be(RecruitId);
        dashboard.Recruits[0].TaskTotal.Should().Be(5);
        dashboard.Recruits[0].TaskCompleted.Should().Be(2);
        dashboard.Recruits[0].TaskCompletionPercent.Should().Be(40);
        dashboard.Recruits[0].OpenIssues.Should().Be(2);
        dashboard.OpenIssuesBySeverity.Critical.Should().Be(1);
        dashboard.OpenIssuesBySeverity.Low.Should().Be(1);
        dashboard.OpenIssuesBySeverity.Medium.Should().Be(0);
        dashboard.FeedbackCounts.Total.Should().Be(2);
        dashboard.FeedbackCounts.Concern.Should().Be(0);
        dashboard.Totals.Tasks.Should().Be(5);
        dashboard.Totals.Notes.Should().Be(1);
    }

    [Fact]
    public async Task ManagerDashboardForAnAdminCoversEveryRecruit()
    {
        var dashboard = await ServiceFor(AdminId, UserRole.Admin).GetManagerDashboardAsync();

        dashboard.RecruitCount.Should().Be(2);
        dashboard.Totals.Tasks.Should().Be(6);
        dashboard.FeedbackCounts.Concern.Should().Be(1);
    }

    [Fact]
    public async Task AdminDashboardAggregatesUsersAndWeeklyActivity()
    {
        var dashboard = await ServiceFor(AdminId, UserRole.Admin).GetAdminDashboardAsync();

        dashboard.UserCount.Should().Be(4);
        dashboard.UsersByRole.Should().Contain(entry => entry.Label == "NewRecruit" && entry.Count == 2);
        dashboard.UsersByDepartment.Should().Contain(entry => entry.Label == "Engineering" && entry.Count == 2);
        dashboard.UsersByDepartment.Should().Contain(entry => entry.Label == "Unassigned" && entry.Count == 1);
        dashboard.ActivityByWeek.Should().HaveCount(8);
        dashboard.ActivityByWeek.Should().BeInAscendingOrder(week => week.WeekStartDate);
        dashboard.ActivityByWeek.Sum(week => week.Tasks).Should().Be(6);
        dashboard.Totals.Issues.Should().Be(4);
    }

    private sealed class StubCurrentUser : ICurrentUser
    {
        public StubCurrentUser(int id, UserRole role)
        {
            Id = id;
            Role = role;
        }

        public int Id { get; }

        public UserRole Role { get; }

        public bool IsAuthenticated => true;
    }
}
