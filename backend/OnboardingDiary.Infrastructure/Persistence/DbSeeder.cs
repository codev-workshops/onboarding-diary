using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Infrastructure.Persistence;

public static class DbSeeder
{
    public static async Task SeedAsync(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;
        var context = sp.GetRequiredService<AppDbContext>();
        var configuration = sp.GetRequiredService<IConfiguration>();
        var environment = sp.GetRequiredService<IHostEnvironment>();
        var logger = sp.GetRequiredService<ILogger<AppDbContext>>();

        if (!environment.IsDevelopment())
            return;

        try
        {
            if (context.Database.IsRelational())
            {
                await context.Database.MigrateAsync();
                logger.LogInformation("Applied pending migrations");
            }
            else
            {
                await context.Database.EnsureCreatedAsync();
            }
        }
        catch (InvalidOperationException)
        {
            await context.Database.EnsureCreatedAsync();
        }

        var adminEmail = configuration["Seed:AdminEmail"] ?? "admin@onboardingdiary.com";
        var adminPassword = configuration["Seed:AdminPassword"] ?? "Admin@123";

        var adminExists = await context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == adminEmail);

        if (!adminExists)
        {
            var admin = new User
            {
                Email = adminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword, workFactor: 12),
                Name = "System Administrator",
                Role = Role.Admin,
                Department = "Engineering",
                StartDate = DateTime.UtcNow,
                IsActive = true
            };

            context.Users.Add(admin);
            await context.SaveChangesAsync();
            logger.LogInformation("Seeded default admin user: {Email}", adminEmail);
        }
    }
}
