using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Auth;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Profile;

public enum UpdateProfileStatus
{
    Updated,
    UserNotFound,
    UnknownDepartment,
}

public class ProfileService(AppDbContext db, TimeProvider timeProvider)
{
    public async Task<UserProfileResponse?> GetAsync(
        int userId,
        CancellationToken cancellationToken = default
    )
    {
        var user = await db
            .Users.Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        return user is null ? null : UserProfileResponse.From(user);
    }

    public async Task<(UpdateProfileStatus Status, UserProfileResponse? Profile)> UpdateAsync(
        int userId,
        UpdateProfileRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var user = await db
            .Users.Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
        {
            return (UpdateProfileStatus.UserNotFound, null);
        }

        if (request.DepartmentId is { } departmentId)
        {
            var department = await db.Departments.FirstOrDefaultAsync(
                d => d.Id == departmentId && d.IsActive,
                cancellationToken
            );

            if (department is null)
            {
                return (UpdateProfileStatus.UnknownDepartment, null);
            }

            user.Department = department;
        }
        else
        {
            user.Department = null;
        }

        user.DepartmentId = request.DepartmentId;
        user.FullName = request.FullName.Trim();

        if (user.Role == UserRole.Recruit && request.StartDate is not null)
        {
            user.StartDate = request.StartDate;
        }

        user.UpdatedAt = timeProvider.GetUtcNow();
        await db.SaveChangesAsync(cancellationToken);

        return (UpdateProfileStatus.Updated, UserProfileResponse.From(user));
    }

    public async Task<IReadOnlyList<DepartmentResponse>> ListDepartmentsAsync(
        CancellationToken cancellationToken = default
    ) =>
        await db
            .Departments.Where(d => d.IsActive)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentResponse(d.Id, d.Name))
            .ToListAsync(cancellationToken);
}
