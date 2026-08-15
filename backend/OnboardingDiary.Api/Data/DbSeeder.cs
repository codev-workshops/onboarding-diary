using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Models;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Data;

public static class DbSeeder
{
    public const string AdminEmail = "admin@onboarding.local";
    public const string AdminPassword = "Admin#12345";

    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher, CancellationToken cancellationToken = default)
    {
        if (await db.Users.AnyAsync(u => u.Email == AdminEmail, cancellationToken))
        {
            return;
        }

        var (hash, salt) = hasher.Hash(AdminPassword);
        db.Users.Add(new User
        {
            Email = AdminEmail,
            PasswordHash = hash,
            PasswordSalt = salt,
            FullName = "System Administrator",
            Role = UserRole.Admin,
            Department = "People Operations",
            StartDate = DateTime.UtcNow.ToUtcDate()
        });

        await db.SaveChangesAsync(cancellationToken);
    }
}
