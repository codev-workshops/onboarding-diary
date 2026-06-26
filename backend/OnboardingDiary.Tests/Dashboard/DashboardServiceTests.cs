using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Tasks;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Application.Tasks.Mapping;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Dashboard;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Infrastructure.Tasks;
using FeedbackEntity = OnboardingDiary.Domain.Entities.Feedback;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Tests.Dashboard;

public class DashboardServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _managerId = Guid.NewGuid();
    private readonly Guid _recruitAId = Guid.NewGuid();
    private readonly Guid _recruitBId = Guid.NewGuid();

    static DashboardServiceTests()
    {
        TaskMappingConfig.Configure();
    }

    public DashboardServiceTests()
    {
        var efSp = new ServiceCollection()
            .AddEntityFrameworkInMemoryDatabase()
            .BuildServiceProvider();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("DashboardServiceTests_" + Guid.NewGuid())
            .UseInternalServiceProvider(efSp)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        SeedData();
    }

    private void SeedData()
    {
        _context.Users.AddRange(
            new User { Id = _userId, Email = "recruit@test.com", PasswordHash = "h", Name = "Recruit", Role = Role.Recruit, Department = "Engineering", StartDate = DateTime.UtcNow.AddDays(-30), IsActive = true, ManagerId = _managerId },
            new User { Id = _managerId, Email = "manager@test.com", PasswordHash = "h", Name = "Manager", Role = Role.Manager, Department = "Engineering", StartDate = DateTime.UtcNow.AddDays(-100), IsActive = true },
            new User { Id = _recruitAId, Email = "recruitA@test.com", PasswordHash = "h", Name = "Recruit A", Role = Role.Recruit, Department = "Engineering", StartDate = DateTime.UtcNow.AddDays(-10), IsActive = true, ManagerId = _managerId },
            new User { Id = _recruitBId, Email = "recruitB@test.com", PasswordHash = "h", Name = "Recruit B", Role = Role.Recruit, Department = "Marketing", StartDate = DateTime.UtcNow.AddDays(-20), IsActive = true, ManagerId = _managerId }
        );

        _context.Tasks.AddRange(
            new TaskEntity { Id = Guid.NewGuid(), UserId = _userId, Title = "Task1", Date = DateTime.UtcNow, Status = TaskStatus.Completed, Category = TaskCategory.Training, Priority = Priority.Medium, CompletedAt = DateTime.UtcNow },
            new TaskEntity { Id = Guid.NewGuid(), UserId = _userId, Title = "Task2", Date = DateTime.UtcNow.AddDays(-1), Status = TaskStatus.InProgress, Category = TaskCategory.Training, Priority = Priority.Medium },
            new TaskEntity { Id = Guid.NewGuid(), UserId = _userId, Title = "Task3", Date = DateTime.UtcNow.AddDays(-2), Status = TaskStatus.NotStarted, Category = TaskCategory.Training, Priority = Priority.Medium },
            new TaskEntity { Id = Guid.NewGuid(), UserId = _recruitAId, Title = "TaskA1", Date = DateTime.UtcNow, Status = TaskStatus.Completed, Category = TaskCategory.Training, Priority = Priority.Medium, CompletedAt = DateTime.UtcNow },
            new TaskEntity { Id = Guid.NewGuid(), UserId = _recruitAId, Title = "TaskA2", Date = DateTime.UtcNow, Status = TaskStatus.InProgress, Category = TaskCategory.Training, Priority = Priority.Medium },
            new TaskEntity { Id = Guid.NewGuid(), UserId = _recruitBId, Title = "TaskB1", Date = DateTime.UtcNow, Status = TaskStatus.Completed, Category = TaskCategory.Training, Priority = Priority.Medium, CompletedAt = DateTime.UtcNow }
        );

        _context.Issues.AddRange(
            new Issue { Id = Guid.NewGuid(), UserId = _userId, Title = "Critical Bug", Date = DateTime.UtcNow, Description = "d", Severity = IssueSeverity.Critical, Status = IssueStatus.Open, IsEscalated = true },
            new Issue { Id = Guid.NewGuid(), UserId = _userId, Title = "Minor Issue", Date = DateTime.UtcNow.AddDays(-1), Description = "d", Severity = IssueSeverity.Low, Status = IssueStatus.Open },
            new Issue { Id = Guid.NewGuid(), UserId = _userId, Title = "Resolved", Date = DateTime.UtcNow.AddDays(-2), Description = "d", Severity = IssueSeverity.Medium, Status = IssueStatus.Resolved },
            new Issue { Id = Guid.NewGuid(), UserId = _recruitAId, Title = "RecruitA Issue", Date = DateTime.UtcNow, Description = "d", Severity = IssueSeverity.High, Status = IssueStatus.Open, IsEscalated = true },
            new Issue { Id = Guid.NewGuid(), UserId = _recruitBId, Title = "RecruitB Issue", Date = DateTime.UtcNow, Description = "d", Severity = IssueSeverity.Low, Status = IssueStatus.InProgress }
        );

        _context.Feedbacks.AddRange(
            new FeedbackEntity { Id = Guid.NewGuid(), UserId = _userId, Subject = "Great", Date = DateTime.UtcNow, Details = "d", Type = FeedbackType.Positive },
            new FeedbackEntity { Id = Guid.NewGuid(), UserId = _userId, Subject = "Idea", Date = DateTime.UtcNow.AddDays(-1), Details = "d", Type = FeedbackType.Suggestion }
        );

        _context.Notes.AddRange(
            new Note { Id = Guid.NewGuid(), UserId = _userId, Title = "Note1", Date = DateTime.UtcNow, Content = "c", IsPinned = true },
            new Note { Id = Guid.NewGuid(), UserId = _userId, Title = "Note2", Date = DateTime.UtcNow.AddDays(-1), Content = "c", IsPinned = false }
        );

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private DashboardService CreateService(Guid? userId = null, string role = "Recruit")
    {
        var currentUser = new FakeCurrentUser(userId ?? _userId, role);
        var taskRepo = new TaskRepository(_context);
        var taskService = new TaskService(taskRepo, currentUser, _context);
        return new DashboardService(_context, currentUser, taskService);
    }

    [Fact]
    public async Task GetSummary_ReturnsCorrectCounts()
    {
        var service = CreateService();
        var result = await service.GetSummaryAsync();

        Assert.Equal(3, result.TaskStats.Total);
        Assert.Equal(1, result.TaskStats.Completed);
        Assert.Equal(1, result.TaskStats.InProgress);

        Assert.Equal(3, result.IssueStats.Total);
        Assert.Equal(2, result.IssueStats.Open);
        Assert.Equal(1, result.IssueStats.Resolved);
        Assert.Equal(1, result.IssueStats.Critical);
        Assert.Equal(1, result.IssueStats.Escalated);

        Assert.Equal(2, result.FeedbackStats.Total);
        Assert.Equal(1, result.FeedbackStats.Positive);
        Assert.Equal(1, result.FeedbackStats.Suggestion);
        Assert.Equal(0, result.FeedbackStats.Concern);

        Assert.Equal(2, result.NoteStats.Total);
        Assert.Equal(1, result.NoteStats.Pinned);
    }

    [Fact]
    public async Task GetSummary_ReturnsLast5RecentEntries()
    {
        var service = CreateService();
        var result = await service.GetSummaryAsync();

        Assert.Equal(3, result.RecentEntries.Tasks.Count);
        Assert.Equal(3, result.RecentEntries.Issues.Count);
        Assert.Equal(2, result.RecentEntries.Feedback.Count);
        Assert.Equal(2, result.RecentEntries.Notes.Count);

        Assert.Equal("Task1", result.RecentEntries.Tasks[0].Title);
    }

    [Fact]
    public async Task GetSummary_CompletionPercentage()
    {
        var service = CreateService();
        var result = await service.GetSummaryAsync();

        var expected = Math.Round((double)1 / 3 * 100, 2);
        Assert.Equal(expected, result.TaskStats.CompletionRate);
    }

    [Fact]
    public async Task GetSummary_OpenIssuesSortedCriticalFirst()
    {
        var service = CreateService();
        var result = await service.GetSummaryAsync();

        Assert.Equal(2, result.OpenIssues.Count);
        Assert.Equal("Critical", result.OpenIssues[0].Severity);
        Assert.Equal("Low", result.OpenIssues[1].Severity);
    }

    [Fact]
    public async Task GetTeam_ManagerScopedToAssignedRecruits()
    {
        var service = CreateService(_managerId, "Manager");
        var result = await service.GetTeamAsync(null);

        Assert.Equal(3, result.Count);
        Assert.Contains(result, r => r.Name == "Recruit");
        Assert.Contains(result, r => r.Name == "Recruit A");
        Assert.Contains(result, r => r.Name == "Recruit B");
    }

    [Fact]
    public async Task GetTeam_AdminFiltersByDepartment()
    {
        var adminId = Guid.NewGuid();
        _context.Users.Add(new User { Id = adminId, Email = "admin@test.com", PasswordHash = "h", Name = "Admin", Role = Role.Admin, Department = "Engineering", StartDate = DateTime.UtcNow, IsActive = true });
        _context.SaveChanges();

        var service = CreateService(adminId, "Admin");

        var all = await service.GetTeamAsync(null);
        Assert.True(all.Count >= 3);

        var engineeringOnly = await service.GetTeamAsync("Engineering");
        Assert.All(engineeringOnly, r => Assert.Equal("Engineering", r.Department));
        Assert.DoesNotContain(engineeringOnly, r => r.Department == "Marketing");
    }

    [Fact]
    public async Task GetTeam_DaysSinceStartComputedCorrectly()
    {
        var service = CreateService(_managerId, "Manager");
        var result = await service.GetTeamAsync(null);

        var recruitA = result.First(r => r.Name == "Recruit A");
        Assert.Equal(10, recruitA.DaysSinceStart);
    }

    [Fact]
    public async Task GetTeam_CompletionPercentageComputedCorrectly()
    {
        var service = CreateService(_managerId, "Manager");
        var result = await service.GetTeamAsync(null);

        var recruitA = result.First(r => r.Name == "Recruit A");
        Assert.Equal(50.0, recruitA.CompletionPercentage);

        var recruitB = result.First(r => r.Name == "Recruit B");
        Assert.Equal(100.0, recruitB.CompletionPercentage);
    }

    [Fact]
    public async Task GetSummary_ExcludesSoftDeletedEntries()
    {
        var deletedTask = new TaskEntity { Id = Guid.NewGuid(), UserId = _userId, Title = "Deleted", Date = DateTime.UtcNow, Status = TaskStatus.NotStarted, Category = TaskCategory.Training, Priority = Priority.Medium, IsDeleted = true };
        _context.Tasks.Add(deletedTask);
        _context.SaveChanges();

        var service = CreateService();
        var result = await service.GetSummaryAsync();

        Assert.Equal(3, result.TaskStats.Total);
    }

    private class FakeCurrentUser : ICurrentUser
    {
        public Guid? UserId { get; }
        public string? Role { get; }
        public bool IsAuthenticated => UserId.HasValue;

        public FakeCurrentUser(Guid userId, string role)
        {
            UserId = userId;
            Role = role;
        }
    }
}
