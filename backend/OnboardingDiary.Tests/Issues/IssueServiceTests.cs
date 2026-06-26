using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Issues.Dtos;
using OnboardingDiary.Application.Issues.Mapping;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Infrastructure.Issues;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Issues;

public class IssueServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly IssueRepository _repository;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _managerId = Guid.NewGuid();

    static IssueServiceTests()
    {
        IssueMappingConfig.Configure();
    }

    public IssueServiceTests()
    {
        var efSp = new ServiceCollection()
            .AddEntityFrameworkInMemoryDatabase()
            .BuildServiceProvider();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("IssueServiceTests_" + Guid.NewGuid())
            .UseInternalServiceProvider(efSp)
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        _context.Users.Add(new User
        {
            Id = _managerId,
            Email = "manager@test.com",
            PasswordHash = "hash",
            Name = "Test Manager",
            Role = Role.Manager,
            Department = "Engineering",
            StartDate = DateTime.UtcNow,
            IsActive = true,
        });

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
            ManagerId = _managerId,
        });

        _context.SaveChanges();
        _repository = new IssueRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private IssueService CreateService(Guid? userId = null, string role = "Recruit")
    {
        var currentUser = new FakeCurrentUser(userId ?? _userId, role);
        var emailSender = new FakeEmailSender();
        return new IssueService(_repository, currentUser, _context, emailSender);
    }

    private IssueService CreateServiceWithEmailSender(out FakeEmailSender emailSender, Guid? userId = null, string role = "Recruit")
    {
        var currentUser = new FakeCurrentUser(userId ?? _userId, role);
        emailSender = new FakeEmailSender();
        return new IssueService(_repository, currentUser, _context, emailSender);
    }

    private CreateIssueRequest ValidCreate(IssueStatus status = IssueStatus.Open) => new(
        Date: DateTime.UtcNow.Date,
        Title: "Test Issue",
        Description: "A valid description that meets the minimum length",
        Severity: IssueSeverity.Medium,
        Status: status);

    [Fact]
    public async Task Create_ReturnsIssueDto()
    {
        var service = CreateService();
        var result = await service.CreateAsync(ValidCreate());

        Assert.NotNull(result);
        Assert.Equal("Test Issue", result.Title);
        Assert.Equal("Open", result.Status);
        Assert.Null(result.ResolvedAt);
    }

    [Fact]
    public async Task Create_SetsResolvedAt_WhenStatusResolved()
    {
        var service = CreateService();
        var result = await service.CreateAsync(ValidCreate(IssueStatus.Resolved));

        Assert.NotNull(result.ResolvedAt);
    }

    [Fact]
    public async Task Create_DoesNotSetResolvedAt_WhenStatusOpen()
    {
        var service = CreateService();
        var result = await service.CreateAsync(ValidCreate());

        Assert.Null(result.ResolvedAt);
    }

    [Fact]
    public async Task Update_SetsResolvedAt_OnTransitionToResolved()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidCreate());

        Assert.Null(created.ResolvedAt);

        var updated = await service.UpdateAsync(
            created.Id,
            new UpdateIssueRequest("Test Issue", "A valid description that meets the minimum length",
                IssueSeverity.Medium, IssueStatus.Resolved, "Fixed it"));

        Assert.NotNull(updated);
        Assert.NotNull(updated.ResolvedAt);
    }

    [Fact]
    public async Task Update_ClearsResolvedAt_OnTransitionToOpen()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidCreate(IssueStatus.Resolved));

        Assert.NotNull(created.ResolvedAt);

        var updated = await service.UpdateAsync(
            created.Id,
            new UpdateIssueRequest("Test Issue", "A valid description that meets the minimum length",
                IssueSeverity.Medium, IssueStatus.Open, null));

        Assert.NotNull(updated);
        Assert.Null(updated.ResolvedAt);
    }

    [Fact]
    public async Task Update_RejectsClosedToOpen()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidCreate(IssueStatus.Closed));

        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            service.UpdateAsync(
                created.Id,
                new UpdateIssueRequest("Test Issue", "A valid description that meets the minimum length",
                    IssueSeverity.Medium, IssueStatus.Open, null)));
    }

    [Fact]
    public async Task Delete_SetsIsDeleted()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidCreate());

        var deleted = await service.DeleteAsync(created.Id);
        Assert.True(deleted);

        var entity = await _context.Issues
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.Id == created.Id);
        Assert.NotNull(entity);
        Assert.True(entity.IsDeleted);
    }

    [Fact]
    public async Task List_ExcludesSoftDeletedIssues()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidCreate());

        await service.DeleteAsync(created.Id);

        var list = await service.ListAsync(new IssueListQuery());
        Assert.DoesNotContain(list.Items, i => i.Id == created.Id);
    }

    [Fact]
    public async Task Escalate_SetsIsEscalated()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidCreate());

        var escalated = await service.EscalateAsync(
            created.Id, new EscalateIssueRequest("Needs manager attention"));

        Assert.NotNull(escalated);
        Assert.True(escalated.IsEscalated);
    }

    [Fact]
    public async Task Escalate_TriggersEmailSender()
    {
        var service = CreateServiceWithEmailSender(out var emailSender);
        var created = await service.CreateAsync(ValidCreate());

        await service.EscalateAsync(created.Id, new EscalateIssueRequest("Help needed"));

        Assert.Single(emailSender.SentEmails);
        Assert.Contains("Issue Escalated", emailSender.SentEmails[0].Subject);
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

    private class FakeEmailSender : IEmailSender
    {
        public List<(string To, string Subject, string Body)> SentEmails { get; } = new();

        public Task SendAsync(string toEmail, string subject, string body)
        {
            SentEmails.Add((toEmail, subject, body));
            return Task.CompletedTask;
        }
    }
}
