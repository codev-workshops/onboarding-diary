using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await context.Database.MigrateAsync();

        if (await context.Users.AnyAsync())
            return;

        var adminUser = new User
        {
            Name = "Admin",
            Email = "admin@onboarding.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = UserRole.Admin,
            Department = "Engineering",
            StartDate = DateTime.UtcNow,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Users.Add(adminUser);

        var departments = new[]
        {
            new Department { Name = "Engineering", Description = "Software engineering and development", CreatedAt = DateTime.UtcNow },
            new Department { Name = "Design", Description = "UI/UX and product design", CreatedAt = DateTime.UtcNow },
            new Department { Name = "Product", Description = "Product management and strategy", CreatedAt = DateTime.UtcNow }
        };

        context.Departments.AddRange(departments);

        var categories = new[]
        {
            new Category { Name = "Setup", Description = "Environment setup and configuration tasks", CreatedAt = DateTime.UtcNow },
            new Category { Name = "Training", Description = "Training and learning activities", CreatedAt = DateTime.UtcNow },
            new Category { Name = "Documentation", Description = "Documentation and knowledge base tasks", CreatedAt = DateTime.UtcNow }
        };

        context.Categories.AddRange(categories);

        await context.SaveChangesAsync();
    }
}
