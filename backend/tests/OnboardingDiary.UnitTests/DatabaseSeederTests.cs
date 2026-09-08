using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Infrastructure;
using OnboardingDiary.Api.Infrastructure.Seed;

namespace OnboardingDiary.UnitTests;

public class DatabaseSeederTests
{
    [Fact]
    public async Task Seeding_twice_does_not_duplicate_departments()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;
        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        await DatabaseSeeder.SeedAsync(db);
        var afterFirstRun = await db.Departments.CountAsync();

        await DatabaseSeeder.SeedAsync(db);

        Assert.True(afterFirstRun > 0);
        Assert.Equal(afterFirstRun, await db.Departments.CountAsync());
    }
}
