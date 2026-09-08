using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Admin;

public enum AdminUserStatus
{
    Succeeded,
    NotFound,
    EmailAlreadyRegistered,
    UnknownDepartment,
    InvalidManager,
    SelfChangeNotAllowed,
}

/// <summary>
/// Admin-only user administration: listing, creating and re-assigning users. Only recruits have a
/// manager, and only an active manager may be assigned — that keeps the reporting graph one level
/// deep and free of cycles.
/// </summary>
public class AdminService(AppDbContext db, IPasswordHasher<User> passwordHasher, TimeProvider timeProvider)
{
    public async Task<PagedResponse<AdminUserResponse>> ListAsync(
        AdminUserListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var users = db.Users.AsNoTracking().Include(u => u.Department).Include(u => u.Manager);
        var filtered = (IQueryable<User>)users;

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            filtered = filtered.Where(u =>
                EF.Functions.Like(u.FullName, $"%{term}%") || EF.Functions.Like(u.Email, $"%{term}%")
            );
        }

        if (query.Role is { } role)
        {
            filtered = filtered.Where(u => u.Role == role);
        }

        if (query.DepartmentId is { } departmentId)
        {
            filtered = filtered.Where(u => u.DepartmentId == departmentId);
        }

        if (query.ManagerId is { } managerId)
        {
            filtered = filtered.Where(u => u.ManagerId == managerId);
        }

        if (query.IsActive is { } isActive)
        {
            filtered = filtered.Where(u => u.IsActive == isActive);
        }

        filtered = query.Sort switch
        {
            "-name" => filtered.OrderByDescending(u => u.FullName).ThenBy(u => u.Id),
            "email" => filtered.OrderBy(u => u.Email).ThenBy(u => u.Id),
            _ => filtered.OrderBy(u => u.FullName).ThenBy(u => u.Id),
        };

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await filtered.CountAsync(cancellationToken);
        var items = await filtered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => AdminUserResponse.From(u))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AdminUserResponse>(items, page, pageSize, total);
    }

    public async Task<(AdminUserStatus Status, AdminUserResponse? User)> CreateAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        {
            return (AdminUserStatus.EmailAlreadyRegistered, null);
        }

        var (departmentStatus, department) = await ResolveDepartmentAsync(
            request.DepartmentId,
            cancellationToken
        );
        if (departmentStatus != AdminUserStatus.Succeeded)
        {
            return (departmentStatus, null);
        }

        var (managerStatus, manager) = await ResolveManagerAsync(
            request.ManagerId,
            request.Role,
            null,
            cancellationToken
        );
        if (managerStatus != AdminUserStatus.Succeeded)
        {
            return (managerStatus, null);
        }

        var now = timeProvider.GetUtcNow();
        var user = new User
        {
            Email = email,
            FullName = request.FullName.Trim(),
            PasswordHash = string.Empty,
            Role = request.Role,
            DepartmentId = department?.Id,
            Department = department,
            ManagerId = manager?.Id,
            Manager = manager,
            StartDate = request.Role == UserRole.Recruit ? request.StartDate : null,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        return (AdminUserStatus.Succeeded, AdminUserResponse.From(user));
    }

    public async Task<(AdminUserStatus Status, AdminUserResponse? User)> UpdateAsync(
        int callerId,
        int id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var user = await db
            .Users.Include(u => u.Department)
            .Include(u => u.Manager)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user is null)
        {
            return (AdminUserStatus.NotFound, null);
        }

        // An admin locking themselves out would leave the installation unadministrable.
        if (id == callerId && (request.Role != user.Role || !request.IsActive))
        {
            return (AdminUserStatus.SelfChangeNotAllowed, null);
        }

        var (departmentStatus, department) = await ResolveDepartmentAsync(
            request.DepartmentId,
            cancellationToken
        );
        if (departmentStatus != AdminUserStatus.Succeeded)
        {
            return (departmentStatus, null);
        }

        var (managerStatus, manager) = await ResolveManagerAsync(
            request.ManagerId,
            request.Role,
            user.Id,
            cancellationToken
        );
        if (managerStatus != AdminUserStatus.Succeeded)
        {
            return (managerStatus, null);
        }

        user.FullName = request.FullName.Trim();
        user.Role = request.Role;
        user.DepartmentId = department?.Id;
        user.Department = department;
        user.ManagerId = manager?.Id;
        user.Manager = manager;
        user.StartDate = request.Role == UserRole.Recruit ? request.StartDate : null;
        user.IsActive = request.IsActive;
        user.UpdatedAt = timeProvider.GetUtcNow();

        // A user who is no longer an active manager cannot keep reports.
        if (user.Role != UserRole.Manager || !user.IsActive)
        {
            await db
                .Users.Where(u => u.ManagerId == user.Id)
                .ExecuteUpdateAsync(u => u.SetProperty(x => x.ManagerId, (int?)null), cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);

        return (AdminUserStatus.Succeeded, AdminUserResponse.From(user));
    }

    public async Task<AdminStatsResponse> StatsAsync(CancellationToken cancellationToken = default)
    {
        var users = db.Users.AsNoTracking();

        return new AdminStatsResponse(
            await users.CountAsync(cancellationToken),
            await users.CountAsync(u => u.IsActive, cancellationToken),
            await users.CountAsync(u => u.Role == UserRole.Recruit, cancellationToken),
            await users.CountAsync(u => u.Role == UserRole.Manager, cancellationToken),
            await users.CountAsync(u => u.Role == UserRole.Admin, cancellationToken),
            await users.CountAsync(
                u => u.Role == UserRole.Recruit && u.ManagerId == null,
                cancellationToken
            ),
            await db.Tasks.CountAsync(cancellationToken),
            await db.Issues.CountAsync(
                i => i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress,
                cancellationToken
            )
        );
    }

    private async Task<(AdminUserStatus Status, Department? Department)> ResolveDepartmentAsync(
        int? departmentId,
        CancellationToken cancellationToken
    )
    {
        if (departmentId is not { } id)
        {
            return (AdminUserStatus.Succeeded, null);
        }

        var department = await db.Departments.FirstOrDefaultAsync(
            d => d.Id == id && d.IsActive,
            cancellationToken
        );

        return department is null
            ? (AdminUserStatus.UnknownDepartment, null)
            : (AdminUserStatus.Succeeded, department);
    }

    private async Task<(AdminUserStatus Status, User? Manager)> ResolveManagerAsync(
        int? managerId,
        UserRole role,
        int? userId,
        CancellationToken cancellationToken
    )
    {
        if (managerId is not { } id)
        {
            return (AdminUserStatus.Succeeded, null);
        }

        if (role != UserRole.Recruit || id == userId)
        {
            return (AdminUserStatus.InvalidManager, null);
        }

        var manager = await db.Users.FirstOrDefaultAsync(
            u => u.Id == id && u.Role == UserRole.Manager && u.IsActive,
            cancellationToken
        );

        return manager is null
            ? (AdminUserStatus.InvalidManager, null)
            : (AdminUserStatus.Succeeded, manager);
    }
}
