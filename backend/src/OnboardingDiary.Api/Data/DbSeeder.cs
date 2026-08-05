using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Data;

public class SeedAdminOptions
{
    public const string SectionName = "SeedAdmin";

    public string? Email { get; set; }
    public string? Password { get; set; }
    public string FullName { get; set; } = "Administrator";
    public string Department { get; set; } = "IT";
}

public static class DbSeeder
{
    /// Creates the configured admin account if it does not exist yet. No-op when unconfigured.
    public static async Task SeedAdminAsync(AppDbContext db, SeedAdminOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Email) || string.IsNullOrWhiteSpace(options.Password)) return;

        var email = options.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email)) return;

        db.Users.Add(new User
        {
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(options.Password),
            FullName = options.FullName,
            Department = options.Department,
            Role = UserRole.Admin,
            StartDate = DateOnly.FromDateTime(DateTime.UtcNow)
        });

        await db.SaveChangesAsync();
    }
}
