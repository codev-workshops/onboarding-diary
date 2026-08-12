using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Tests.Persistence;

public class AppDbContextTests : IDisposable
{
    private readonly AppDbContext _context;

    public AppDbContextTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDbContext(options);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public void ModelBuilds_AllExpectedEntityTypesExist()
    {
        var entityTypes = _context.Model.GetEntityTypes()
            .Select(e => e.ClrType.Name)
            .ToList();

        Assert.Contains("User", entityTypes);
        Assert.Contains("TaskEntity", entityTypes);
        Assert.Contains("Issue", entityTypes);
        Assert.Contains("Feedback", entityTypes);
        Assert.Contains("Note", entityTypes);
        Assert.Contains("Report", entityTypes);
        Assert.Contains("RefreshToken", entityTypes);
        Assert.Contains("AuditLog", entityTypes);
    }

    [Fact]
    public void SaveChanges_SetsCreatedAtAndUpdatedAt_OnAdd()
    {
        var user = CreateUser();
        var beforeSave = DateTime.UtcNow;

        _context.Users.Add(user);
        _context.SaveChanges();

        Assert.True(user.CreatedAt >= beforeSave.AddSeconds(-1));
        Assert.True(user.UpdatedAt >= beforeSave.AddSeconds(-1));
        Assert.Equal(user.CreatedAt, user.UpdatedAt);
    }

    [Fact]
    public void SaveChanges_UpdatesUpdatedAt_OnModify()
    {
        var user = CreateUser();
        _context.Users.Add(user);
        _context.SaveChanges();

        var createdAt = user.CreatedAt;

        user.Name = "Updated Name";
        _context.SaveChanges();

        Assert.Equal(createdAt, user.CreatedAt);
        Assert.True(user.UpdatedAt >= createdAt);
    }

    [Fact]
    public void SoftDeleteFilter_HidesDeletedRows()
    {
        var user = CreateUser();
        _context.Users.Add(user);
        _context.SaveChanges();

        var task = new TaskEntity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Date = DateTime.UtcNow,
            Title = "Test Task",
            Category = TaskCategory.Training,
            Status = TaskStatus.NotStarted,
            Priority = Priority.Medium
        };

        _context.Tasks.Add(task);
        _context.SaveChanges();

        Assert.Single(_context.Tasks.ToList());

        _context.Tasks.Remove(task);
        _context.SaveChanges();

        Assert.Empty(_context.Tasks.ToList());
        Assert.Single(_context.Tasks.IgnoreQueryFilters().ToList());
    }

    [Fact]
    public void SoftDelete_SetsIsDeletedTrue_InsteadOfHardDelete()
    {
        var user = CreateUser();
        _context.Users.Add(user);
        _context.SaveChanges();

        var task = new TaskEntity
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Date = DateTime.UtcNow,
            Title = "Test Task",
            Category = TaskCategory.Documentation,
            Status = TaskStatus.InProgress,
            Priority = Priority.High
        };

        _context.Tasks.Add(task);
        _context.SaveChanges();

        _context.Tasks.Remove(task);
        _context.SaveChanges();

        var deletedTask = _context.Tasks.IgnoreQueryFilters().First();
        Assert.True(deletedTask.IsDeleted);
    }

    [Fact]
    public void NoteTags_RoundTripsThroughJsonConversion()
    {
        var user = CreateUser();
        _context.Users.Add(user);
        _context.SaveChanges();

        var tags = new List<string> { "onboarding", "week-1", "important" };
        var note = new Note
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Date = DateTime.UtcNow,
            Title = "Test Note",
            Content = "Some content",
            Tags = tags
        };

        _context.Notes.Add(note);
        _context.SaveChanges();

        _context.ChangeTracker.Clear();

        var loaded = _context.Notes.First();
        Assert.Equal(3, loaded.Tags.Count);
        Assert.Contains("onboarding", loaded.Tags);
        Assert.Contains("week-1", loaded.Tags);
        Assert.Contains("important", loaded.Tags);
    }

    [Fact]
    public void ReportCategories_RoundTripsThroughJsonConversion()
    {
        var user = CreateUser();
        _context.Users.Add(user);
        _context.SaveChanges();

        var categories = new List<string> { "training", "documentation" };
        var report = new Report
        {
            Id = Guid.NewGuid(),
            GeneratedBy = user.Id,
            RecruitId = user.Id,
            StartDate = DateTime.UtcNow.AddDays(-7),
            EndDate = DateTime.UtcNow,
            Categories = categories,
            Format = ReportFormat.Pdf
        };

        _context.Reports.Add(report);
        _context.SaveChanges();

        _context.ChangeTracker.Clear();

        var loaded = _context.Reports.First();
        Assert.Equal(2, loaded.Categories.Count);
        Assert.Contains("training", loaded.Categories);
        Assert.Contains("documentation", loaded.Categories);
    }

    [Fact]
    public async Task SaveChangesAsync_SetsCreatedAtAndUpdatedAt_OnAdd()
    {
        var user = CreateUser("async@test.com");
        var beforeSave = DateTime.UtcNow;

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        Assert.True(user.CreatedAt >= beforeSave.AddSeconds(-1));
        Assert.Equal(user.CreatedAt, user.UpdatedAt);
    }

    private static User CreateUser(string email = "test@example.com") => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        PasswordHash = "hashed",
        Name = "Test User",
        Role = Role.Recruit,
        Department = "Engineering",
        StartDate = DateTime.UtcNow
    };
}
