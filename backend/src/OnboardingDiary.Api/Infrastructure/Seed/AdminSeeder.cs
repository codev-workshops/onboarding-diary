using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Seed;

public static class AdminSeeder
{
    public const string EmailKey = "ADMIN_EMAIL";

    public const string PasswordKey = "ADMIN_PASSWORD";

    /// <summary>
    /// Creates the initial admin from <c>ADMIN_EMAIL</c> / <c>ADMIN_PASSWORD</c> when both are
    /// configured. Idempotent: an existing account with that email is left untouched.
    /// </summary>
    public static async Task<bool> SeedAsync(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        IConfiguration configuration,
        TimeProvider timeProvider,
        CancellationToken cancellationToken = default
    )
    {
        var email = configuration[EmailKey]?.Trim().ToLowerInvariant();
        var password = configuration[PasswordKey];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return false;
        }

        if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            return false;
        }

        var now = timeProvider.GetUtcNow();
        var admin = new User
        {
            Email = email,
            FullName = "Administrator",
            PasswordHash = string.Empty,
            Role = UserRole.Admin,
            CreatedAt = now,
            UpdatedAt = now,
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, password);

        db.Users.Add(admin);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
