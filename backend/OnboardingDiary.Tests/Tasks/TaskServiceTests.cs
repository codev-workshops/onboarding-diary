using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Application.Tasks.Mapping;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Application.Common.Security;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Infrastructure.Tasks;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Tests.Tasks;

public class TaskServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TaskRepository _repository;
    private readonly Guid _userId = Guid.NewGuid();

    static TaskServiceTests()
    {
        TaskMappingConfig.Configure();
    }

    public TaskServiceTests()
    {
        var efSp = new ServiceCollection()
            .AddEntityFrameworkInMemoryDatabase()
            .BuildServiceProvider();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("TaskServiceTests_" + Guid.NewGuid())
            .UseInternalServiceProvider(efSp)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        _context.Users.Add(new User
        {
            Id = _userId,
            Email = "recruit@test.com",
            PasswordHash = "hash",
            Name = "Test Recruit",
            Role = Role.Recruit,
            Department = "Engineering",
            StartDate = DateTime.UtcNow,
            IsActive = true,
        });
        _context.SaveChanges();

        _repository = new TaskRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private TaskService CreateService(Guid? userId = null, string role = "Recruit")
    {
        var currentUser = new FakeCurrentUser(userId ?? _userId, role);
        return new TaskService(_repository, currentUser, _context, new HtmlSanitizer());
    }

    [Fact]
    public async Task Create_SetsCompletedAt_WhenStatusCompleted()
    {
        var service = CreateService();
        var request = new CreateTaskRequest(
            DateTime.UtcNow.Date, "Completed Task", "Has description",
            TaskCategory.Training, TaskStatus.Completed, Priority.Medium);

        var result = await service.CreateAsync(request);

        Assert.NotNull(result);
        Assert.NotNull(result.CompletedAt);
    }

    [Fact]
    public async Task Create_DoesNotSetCompletedAt_WhenStatusNotCompleted()
    {
        var service = CreateService();
        var request = new CreateTaskRequest(
            DateTime.UtcNow.Date, "New Task", null,
            TaskCategory.Setup, TaskStatus.NotStarted, Priority.Low);

        var result = await service.CreateAsync(request);

        Assert.Null(result.CompletedAt);
    }

    [Fact]
    public async Task Delete_SetsIsDeleted()
    {
        var service = CreateService();
        var created = await service.CreateAsync(new CreateTaskRequest(
            DateTime.UtcNow.Date, "To Delete", null,
            TaskCategory.Other, TaskStatus.NotStarted, Priority.Low));

        var deleted = await service.DeleteAsync(created.Id);
        Assert.True(deleted);

        var entity = await _context.Tasks
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == created.Id);
        Assert.NotNull(entity);
        Assert.True(entity.IsDeleted);
    }

    [Fact]
    public async Task Update_SetsCompletedAt_OnTransitionToCompleted()
    {
        var service = CreateService();
        var created = await service.CreateAsync(new CreateTaskRequest(
            DateTime.UtcNow.Date, "In Progress Task", null,
            TaskCategory.Training, TaskStatus.InProgress, Priority.Medium));

        Assert.Null(created.CompletedAt);

        var updated = await service.UpdateAsync(
            created.Id,
            new UpdateTaskRequest(
                DateTime.UtcNow.Date, "In Progress Task", "Now completed",
                TaskCategory.Training, TaskStatus.Completed, Priority.Medium));

        Assert.NotNull(updated);
        Assert.NotNull(updated.CompletedAt);
    }

    [Fact]
    public async Task Update_ClearsCompletedAt_OnTransitionAwayFromCompleted()
    {
        var service = CreateService();
        var created = await service.CreateAsync(new CreateTaskRequest(
            DateTime.UtcNow.Date, "Completed", "Done",
            TaskCategory.Training, TaskStatus.Completed, Priority.Medium));

        Assert.NotNull(created.CompletedAt);

        var updated = await service.UpdateAsync(
            created.Id,
            new UpdateTaskRequest(
                DateTime.UtcNow.Date, "Completed", "Actually not done",
                TaskCategory.Training, TaskStatus.InProgress, Priority.Medium));

        Assert.NotNull(updated);
        Assert.Null(updated.CompletedAt);
    }

    [Fact]
    public async Task List_ExcludesSoftDeletedTasks()
    {
        var service = CreateService();
        var created = await service.CreateAsync(new CreateTaskRequest(
            DateTime.UtcNow.Date, "Will Delete", null,
            TaskCategory.Other, TaskStatus.NotStarted, Priority.Low));

        await service.DeleteAsync(created.Id);

        var list = await service.ListAsync(new TaskListQuery());
        Assert.DoesNotContain(list.Items, t => t.Id == created.Id);
    }

    [Fact]
    public async Task GetStats_ReturnsCorrectCounts()
    {
        var service = CreateService();
        await service.CreateAsync(new CreateTaskRequest(DateTime.UtcNow.Date, "Task1", "desc", TaskCategory.Training, TaskStatus.Completed, Priority.Low));
        await service.CreateAsync(new CreateTaskRequest(DateTime.UtcNow.Date, "Task2", null, TaskCategory.Setup, TaskStatus.InProgress, Priority.Medium));
        await service.CreateAsync(new CreateTaskRequest(DateTime.UtcNow.Date, "Task3", null, TaskCategory.Meeting, TaskStatus.NotStarted, Priority.High));

        var stats = await service.GetStatsAsync(null);

        Assert.Equal(3, stats.Total);
        Assert.Equal(1, stats.Completed);
        Assert.Equal(1, stats.InProgress);
        Assert.Equal(1, stats.Pending);
        Assert.True(stats.CompletionRate > 33 && stats.CompletionRate < 34);
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
