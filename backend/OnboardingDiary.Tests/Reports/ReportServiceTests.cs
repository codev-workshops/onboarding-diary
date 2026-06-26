using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Reports;
using OnboardingDiary.Application.Reports.Dtos;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using OnboardingDiary.Infrastructure.Reports;

namespace OnboardingDiary.Tests.Reports;

public class ReportServiceTests : IDisposable
{
    private readonly AppDbContext _context;

    public ReportServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("ReportServiceTests_" + Guid.NewGuid().ToString("N"))
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        _context = new AppDbContext(options);
    }

    private ReportService CreateService(Guid userId, string role)
    {
        var currentUser = new FakeCurrentUser(userId, role);
        var dataCollector = new ReportDataCollector(_context);
        var renderers = new IReportRenderer[] { new CsvReportRenderer() };
        var fileStore = new InMemoryReportFileStore();
        return new ReportService(_context, currentUser, dataCollector, renderers, fileStore);
    }

    private async Task<User> SeedUser(string name, Role role, Guid? managerId = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{name.ToLower().Replace(" ", "")}@test.com",
            PasswordHash = "hash",
            Name = name,
            Role = role,
            Department = "Engineering",
            StartDate = DateTime.UtcNow.AddDays(-90),
            ManagerId = managerId
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task Recruit_CanGenerateForSelf()
    {
        var recruit = await SeedUser("Recruit", Role.Recruit);
        var service = CreateService(recruit.Id, nameof(Role.Recruit));

        var result = await service.GenerateAsync(new GenerateReportRequest(
            DateTime.UtcNow.AddDays(-30), DateTime.UtcNow,
            new List<string> { "tasks" }, null, ReportFormat.Csv));

        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.ReportId);
    }

    [Fact]
    public async Task Recruit_CannotGenerateForOther()
    {
        var recruit = await SeedUser("Recruit", Role.Recruit);
        var other = await SeedUser("Other", Role.Recruit);
        var service = CreateService(recruit.Id, nameof(Role.Recruit));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GenerateAsync(new GenerateReportRequest(
                DateTime.UtcNow.AddDays(-30), DateTime.UtcNow,
                new List<string> { "tasks" }, other.Id, ReportFormat.Csv)));
    }

    [Fact]
    public async Task Manager_CanGenerateForAssignedRecruit()
    {
        var manager = await SeedUser("Manager", Role.Manager);
        var recruit = await SeedUser("Recruit", Role.Recruit, manager.Id);
        var service = CreateService(manager.Id, nameof(Role.Manager));

        var result = await service.GenerateAsync(new GenerateReportRequest(
            DateTime.UtcNow.AddDays(-30), DateTime.UtcNow,
            new List<string> { "tasks" }, recruit.Id, ReportFormat.Csv));

        Assert.NotNull(result);
    }

    [Fact]
    public async Task Manager_CannotGenerateForNonAssignedRecruit()
    {
        var manager = await SeedUser("Manager", Role.Manager);
        var recruit = await SeedUser("Recruit", Role.Recruit);
        var service = CreateService(manager.Id, nameof(Role.Manager));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GenerateAsync(new GenerateReportRequest(
                DateTime.UtcNow.AddDays(-30), DateTime.UtcNow,
                new List<string> { "tasks" }, recruit.Id, ReportFormat.Csv)));
    }

    [Fact]
    public async Task Admin_CanGenerateForAnyone()
    {
        var admin = await SeedUser("Admin", Role.Admin);
        var recruit = await SeedUser("Recruit", Role.Recruit);
        var service = CreateService(admin.Id, nameof(Role.Admin));

        var result = await service.GenerateAsync(new GenerateReportRequest(
            DateTime.UtcNow.AddDays(-30), DateTime.UtcNow,
            new List<string> { "all" }, recruit.Id, ReportFormat.Csv));

        Assert.NotNull(result);
    }

    [Fact]
    public async Task ListAsync_ReturnsOwnReportsForRecruit()
    {
        var recruit = await SeedUser("Recruit", Role.Recruit);
        var admin = await SeedUser("Admin", Role.Admin);

        _context.Reports.Add(new Report
        {
            Id = Guid.NewGuid(),
            GeneratedBy = recruit.Id,
            RecruitId = recruit.Id,
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new List<string> { "tasks" },
            Format = ReportFormat.Csv,
            FileUrl = "test.csv"
        });
        _context.Reports.Add(new Report
        {
            Id = Guid.NewGuid(),
            GeneratedBy = admin.Id,
            RecruitId = admin.Id,
            StartDate = DateTime.UtcNow.AddDays(-30),
            EndDate = DateTime.UtcNow,
            Categories = new List<string> { "tasks" },
            Format = ReportFormat.Pdf,
            FileUrl = "admin.pdf"
        });
        await _context.SaveChangesAsync();

        var service = CreateService(recruit.Id, nameof(Role.Recruit));
        var result = await service.ListAsync(new ReportListQuery());

        Assert.Equal(1, result.Total);
    }

    [Fact]
    public async Task ListAsync_AdminSeesAll()
    {
        var admin = await SeedUser("Admin2", Role.Admin);
        var recruit = await SeedUser("Recruit2", Role.Recruit);

        _context.Reports.AddRange(
            new Report
            {
                Id = Guid.NewGuid(), GeneratedBy = recruit.Id, RecruitId = recruit.Id,
                StartDate = DateTime.UtcNow.AddDays(-10), EndDate = DateTime.UtcNow,
                Categories = new List<string> { "tasks" }, Format = ReportFormat.Csv, FileUrl = "a.csv"
            },
            new Report
            {
                Id = Guid.NewGuid(), GeneratedBy = admin.Id, RecruitId = admin.Id,
                StartDate = DateTime.UtcNow.AddDays(-10), EndDate = DateTime.UtcNow,
                Categories = new List<string> { "tasks" }, Format = ReportFormat.Pdf, FileUrl = "b.pdf"
            }
        );
        await _context.SaveChangesAsync();

        var service = CreateService(admin.Id, nameof(Role.Admin));
        var result = await service.ListAsync(new ReportListQuery());

        Assert.True(result.Total >= 2);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private class FakeCurrentUser : ICurrentUser
    {
        public FakeCurrentUser(Guid userId, string role)
        {
            UserId = userId;
            Role = role;
        }
        public Guid? UserId { get; }
        public string? Role { get; }
        public bool IsAuthenticated => true;
    }

    private class InMemoryReportFileStore : IReportFileStore
    {
        private readonly Dictionary<string, byte[]> _files = new();

        public Task<string> SaveAsync(Guid reportId, string extension, byte[] content, CancellationToken ct = default)
        {
            var key = $"{reportId}.{extension}";
            _files[key] = content;
            return Task.FromResult(key);
        }

        public Task<Stream> LoadAsync(string fileUrl, CancellationToken ct = default)
        {
            if (!_files.TryGetValue(fileUrl, out var data))
                throw new FileNotFoundException(fileUrl);
            return Task.FromResult<Stream>(new MemoryStream(data));
        }
    }
}
