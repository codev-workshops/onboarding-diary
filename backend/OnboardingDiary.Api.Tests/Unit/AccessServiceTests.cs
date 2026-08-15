using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Models;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Tests.Unit;

public class AccessServiceTests : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();

        _db.Users.AddRange(
            new User { Id = 1, Email = "manager@x.io", FullName = "Manny Manager", Role = UserRole.Manager },
            new User { Id = 2, Email = "recruit@x.io", FullName = "Rita Recruit", Role = UserRole.NewRecruit, ManagerId = 1 },
            new User { Id = 3, Email = "other@x.io", FullName = "Otto Other", Role = UserRole.NewRecruit },
            new User { Id = 4, Email = "admin@x.io", FullName = "Ada Admin", Role = UserRole.Admin });
        await _db.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    private AccessService ServiceFor(int userId, UserRole role) => new(_db, new StubCurrentUser(userId, role));

    [Fact]
    public async Task ManagerCanReadTheirOwnRecruit()
    {
        var act = () => ServiceFor(1, UserRole.Manager).EnsureCanReadAsync(2);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ManagerCannotReadSomebodyElsesRecruit()
    {
        var act = () => ServiceFor(1, UserRole.Manager).EnsureCanReadAsync(3);

        (await act.Should().ThrowAsync<AppException>()).Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task AdminCanReadAnyRecruit()
    {
        var act = () => ServiceFor(4, UserRole.Admin).EnsureCanReadAsync(3);

        await act.Should().NotThrowAsync();
    }

    [Fact]
    public void ManagerCannotWriteToARecruitEntry()
    {
        var act = () => ServiceFor(1, UserRole.Manager).EnsureCanWrite(2);

        act.Should().Throw<AppException>().Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task ResolveReadableUserIdFallsBackToTheCurrentUser()
    {
        var resolved = await ServiceFor(2, UserRole.NewRecruit).ResolveReadableUserIdAsync(null);

        resolved.Should().Be(2);
    }

    [Fact]
    public async Task ResolveReadableUserIdRejectsAnUnrelatedRecruit()
    {
        var act = () => ServiceFor(2, UserRole.NewRecruit).ResolveReadableUserIdAsync(3);

        await act.Should().ThrowAsync<AppException>();
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
