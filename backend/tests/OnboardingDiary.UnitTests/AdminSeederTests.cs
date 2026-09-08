using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Infrastructure;
using OnboardingDiary.Api.Infrastructure.Seed;

namespace OnboardingDiary.UnitTests;

public class AdminSeederTests
{
    private static IConfiguration Configuration(params (string Key, string Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(v => new KeyValuePair<string, string?>(v.Key, v.Value)))
            .Build();

    private static async Task<AppDbContext> CreateDbAsync(SqliteConnection connection)
    {
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;
        var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();
        return db;
    }

    [Fact]
    public async Task Admin_is_not_seeded_without_credentials()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var db = await CreateDbAsync(connection);

        var seeded = await AdminSeeder.SeedAsync(
            db,
            new PasswordHasher<User>(),
            Configuration(),
            TimeProvider.System
        );

        Assert.False(seeded);
        Assert.Equal(0, await db.Users.CountAsync());
    }

    [Fact]
    public async Task Admin_is_seeded_once_from_configuration()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await using var db = await CreateDbAsync(connection);
        var configuration = Configuration(
            (AdminSeeder.EmailKey, "Admin@Example.com"),
            (AdminSeeder.PasswordKey, "admin-password-1")
        );

        Assert.True(
            await AdminSeeder.SeedAsync(
                db,
                new PasswordHasher<User>(),
                configuration,
                TimeProvider.System
            )
        );
        Assert.False(
            await AdminSeeder.SeedAsync(
                db,
                new PasswordHasher<User>(),
                configuration,
                TimeProvider.System
            )
        );

        var admin = await db.Users.SingleAsync();
        Assert.Equal("admin@example.com", admin.Email);
        Assert.Equal(UserRole.Admin, admin.Role);
        Assert.NotEqual(string.Empty, admin.PasswordHash);
    }
}
