using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Seed;

/// <summary>
/// Deterministic fixture users for the Playwright suite. Only the accounts a journey cannot
/// create for itself are seeded — the recruit journey still registers through the signup UI.
/// Development only, opt-in through <c>E2E_SEED=true</c>, and intended for a throwaway database.
/// </summary>
public static class E2eSeeder
{
    public const string EnabledKey = "E2E_SEED";

    public const string Password = "E2ePassword!1";

    public const string AdminEmail = "e2e-admin@example.com";

    public const string ManagerEmail = "e2e-manager@example.com";

    public const string AssignedRecruitEmail = "e2e-assigned@example.com";

    public const string UnassignedRecruitEmail = "e2e-unassigned@example.com";

    public static bool IsEnabled(IHostEnvironment environment, IConfiguration configuration) =>
        environment.IsDevelopment() && configuration.GetValue(EnabledKey, false);

    /// <summary>
    /// Creates the admin, manager, assigned recruit and unassigned recruit, with the manager
    /// assignment in place. Idempotent: existing accounts with these emails are left untouched.
    /// </summary>
    public static async Task SeedAsync(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        TimeProvider timeProvider,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var department = await db.Departments.OrderBy(d => d.Id).FirstAsync(cancellationToken);

        var seeded = await db.Users.AnyAsync(
            u =>
                u.Email == AdminEmail
                || u.Email == ManagerEmail
                || u.Email == AssignedRecruitEmail
                || u.Email == UnassignedRecruitEmail,
            cancellationToken
        );

        if (seeded)
        {
            return;
        }

        User Create(string email, string fullName, UserRole role) =>
            new()
            {
                Email = email,
                FullName = fullName,
                PasswordHash = string.Empty,
                Role = role,
                DepartmentId = department.Id,
                StartDate = DateOnly.FromDateTime(now.UtcDateTime).AddDays(-30),
                CreatedAt = now,
                UpdatedAt = now,
            };

        var manager = Create(ManagerEmail, "E2E Manager", UserRole.Manager);
        var assigned = Create(AssignedRecruitEmail, "E2E Assigned Recruit", UserRole.Recruit);

        List<User> users =
        [
            Create(AdminEmail, "E2E Admin", UserRole.Admin),
            manager,
            assigned,
            Create(UnassignedRecruitEmail, "E2E Unassigned Recruit", UserRole.Recruit),
        ];

        foreach (var user in users)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, Password);
        }

        db.Users.AddRange(users);
        await db.SaveChangesAsync(cancellationToken);

        assigned.ManagerId = manager.Id;
        await db.SaveChangesAsync(cancellationToken);
    }
}
