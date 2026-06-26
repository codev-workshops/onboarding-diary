using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Notes.Dtos;
using OnboardingDiary.Application.Notes.Mapping;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Infrastructure.Notes;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Tests.Notes;

public class NoteServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly NoteRepository _repository;
    private readonly Guid _userId = Guid.NewGuid();

    static NoteServiceTests()
    {
        NoteMappingConfig.Configure();
    }

    public NoteServiceTests()
    {
        var efSp = new ServiceCollection()
            .AddEntityFrameworkInMemoryDatabase()
            .BuildServiceProvider();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("NoteServiceTests_" + Guid.NewGuid())
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

        _repository = new NoteRepository(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    private NoteService CreateService(Guid? userId = null, string role = "Recruit")
    {
        var currentUser = new FakeCurrentUser(userId ?? _userId, role);
        return new NoteService(_repository, currentUser);
    }

    private CreateNoteRequest ValidRequest(string title = "Test Note", bool isPinned = false) => new(
        Date: DateTime.UtcNow.Date,
        Title: title,
        Content: "Some content here",
        Tags: new List<string> { "onboarding" },
        IsPinned: isPinned);

    [Fact]
    public async Task Create_ReturnsNoteDto()
    {
        var service = CreateService();
        var result = await service.CreateAsync(ValidRequest());

        Assert.NotNull(result);
        Assert.Equal("Test Note", result.Title);
        Assert.Equal("Some content here", result.Content);
        Assert.Contains("onboarding", result.Tags);
        Assert.False(result.IsPinned);
    }

    [Fact]
    public async Task Create_Pinned_ReturnsNoteDto()
    {
        var service = CreateService();
        var result = await service.CreateAsync(ValidRequest(isPinned: true));

        Assert.NotNull(result);
        Assert.True(result.IsPinned);
    }

    [Fact]
    public async Task Create_MaxPinnedEnforced_On6thPin()
    {
        var service = CreateService();

        for (int i = 0; i < 5; i++)
        {
            await service.CreateAsync(ValidRequest($"Pinned {i}", isPinned: true));
        }

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(
            () => service.CreateAsync(ValidRequest("Pinned 6", isPinned: true)));
        Assert.Contains("5", ex.Message);
    }

    [Fact]
    public async Task Update_TogglePinFromFalseToTrue_Enforced()
    {
        var service = CreateService();

        for (int i = 0; i < 5; i++)
        {
            await service.CreateAsync(ValidRequest($"Pinned {i}", isPinned: true));
        }

        var unpinned = await service.CreateAsync(ValidRequest("Unpinned", isPinned: false));

        var ex = await Assert.ThrowsAsync<BusinessRuleException>(
            () => service.UpdateAsync(unpinned.Id, new UpdateNoteRequest("Unpinned", "Content", null, true)));
        Assert.Contains("5", ex.Message);
    }

    [Fact]
    public async Task Update_KeepPinnedTrue_DoesNotReject()
    {
        var service = CreateService();

        for (int i = 0; i < 5; i++)
        {
            await service.CreateAsync(ValidRequest($"Pinned {i}", isPinned: true));
        }

        var list = await service.ListAsync(new NoteListQuery());
        var pinnedNote = list.Items.First(n => n.IsPinned);

        var updated = await service.UpdateAsync(pinnedNote.Id,
            new UpdateNoteRequest("Updated Title", "Updated content", null, true));
        Assert.NotNull(updated);
        Assert.True(updated.IsPinned);
    }

    [Fact]
    public async Task Delete_SetsIsDeleted()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidRequest("To Delete"));

        var deleted = await service.DeleteAsync(created.Id);
        Assert.True(deleted);

        var entity = await _context.Notes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(n => n.Id == created.Id);
        Assert.NotNull(entity);
        Assert.True(entity.IsDeleted);
    }

    [Fact]
    public async Task List_ExcludesSoftDeletedNotes()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidRequest("Will Delete"));

        await service.DeleteAsync(created.Id);

        var list = await service.ListAsync(new NoteListQuery());
        Assert.DoesNotContain(list.Items, n => n.Id == created.Id);
    }

    [Fact]
    public async Task List_PinnedNotesFirst()
    {
        var service = CreateService();

        await service.CreateAsync(ValidRequest("Unpinned 1", isPinned: false));
        await service.CreateAsync(ValidRequest("Pinned 1", isPinned: true));
        await service.CreateAsync(ValidRequest("Unpinned 2", isPinned: false));

        var list = await service.ListAsync(new NoteListQuery());
        Assert.True(list.Items.Count >= 3);

        var pinnedIdx = list.Items.ToList().FindIndex(n => n.Title == "Pinned 1");
        var unpinnedIdx = list.Items.ToList().FindIndex(n => n.Title == "Unpinned 1");
        Assert.True(pinnedIdx < unpinnedIdx, "Pinned notes should appear before unpinned notes");
    }

    [Fact]
    public async Task GetById_OtherUser_ReturnsNull()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidRequest());

        var otherService = CreateService(Guid.NewGuid());
        var result = await otherService.GetByIdAsync(created.Id);
        Assert.Null(result);
    }

    [Fact]
    public async Task Delete_OtherUser_ReturnsFalse()
    {
        var service = CreateService();
        var created = await service.CreateAsync(ValidRequest());

        var otherService = CreateService(Guid.NewGuid());
        var result = await otherService.DeleteAsync(created.Id);
        Assert.False(result);
    }

    [Fact]
    public async Task Tags_RoundTripThroughDtoMapping()
    {
        var service = CreateService();
        var tags = new List<string> { "tag-1", "tag-2", "tag-3" };
        var created = await service.CreateAsync(ValidRequest() with { Tags = tags });

        Assert.Equal(3, created.Tags.Count);
        Assert.Contains("tag-1", created.Tags);
        Assert.Contains("tag-2", created.Tags);
        Assert.Contains("tag-3", created.Tags);

        var fetched = await service.GetByIdAsync(created.Id);
        Assert.NotNull(fetched);
        Assert.Equal(3, fetched.Tags.Count);
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
