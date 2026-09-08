using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Infrastructure.Seed;

public static class DatabaseSeeder
{
    private static readonly string[] DepartmentNames =
    [
        "Engineering",
        "Product",
        "Design",
        "Quality Assurance",
        "People Operations"
    ];

    /// <summary>
    /// Adds any missing reference departments. Idempotent: safe to run on every startup.
    /// </summary>
    public static async Task SeedAsync(AppDbContext db, CancellationToken cancellationToken = default)
    {
        var existing = await db
            .Departments.Select(d => d.Name)
            .ToListAsync(cancellationToken);

        var missing = DepartmentNames
            .Except(existing, StringComparer.OrdinalIgnoreCase)
            .Select(name => new Department { Name = name })
            .ToList();

        if (missing.Count == 0)
        {
            return;
        }

        db.Departments.AddRange(missing);
        await db.SaveChangesAsync(cancellationToken);
    }
}
