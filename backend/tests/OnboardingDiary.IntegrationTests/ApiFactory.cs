using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.IntegrationTests;

/// <summary>
/// Hosts the API against a throwaway file-backed SQLite database. A file rather than the
/// in-memory provider so migrations, relational constraints and SQL translation are exercised.
/// Host startup applies the migrations and seeds the reference data.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(
        Path.GetTempPath(),
        $"onboardingdiary-tests-{Guid.NewGuid():N}.db"
    );

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Jwt:Key", "integration-test-signing-key-integration-test-signing-key");
        builder.UseSetting("RateLimiting:LoginPermitLimit", "1000");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlite($"Data Source={_databasePath}")
            );
        });
    }

    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();

        foreach (var suffix in new[] { "", "-shm", "-wal" })
        {
            File.Delete(_databasePath + suffix);
        }
    }
}
