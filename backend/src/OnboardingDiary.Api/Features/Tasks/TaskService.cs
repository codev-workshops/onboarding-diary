using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Tasks;

public record Caller(int UserId, UserRole Role);

public enum TaskAccess
{
    Allowed,
    Denied,
}

public class TaskService(AppDbContext db, TimeProvider timeProvider)
{
    /// <summary>
    /// Resolves whose tasks the caller is asking for. Recruits only ever see their own; managers
    /// see assigned recruits; admins see anyone.
    /// </summary>
    public async Task<(TaskAccess Access, int UserId)> ResolveScopeAsync(
        Caller caller,
        int? requestedUserId,
        CancellationToken cancellationToken = default
    )
    {
        var userId = requestedUserId ?? caller.UserId;

        if (caller.Role == UserRole.Admin)
        {
            return (TaskAccess.Allowed, userId);
        }

        if (userId == caller.UserId)
        {
            return caller.Role == UserRole.Recruit
                ? (TaskAccess.Allowed, userId)
                : (TaskAccess.Denied, userId);
        }

        var assigned =
            caller.Role == UserRole.Manager
            && await db.Users.AnyAsync(
                u => u.Id == userId && u.ManagerId == caller.UserId,
                cancellationToken
            );

        return (assigned ? TaskAccess.Allowed : TaskAccess.Denied, userId);
    }

    public async Task<PagedResponse<TaskResponse>> ListAsync(
        int userId,
        TaskListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var tasks = db.Tasks.AsNoTracking().Where(t => t.UserId == userId);

        if (query.From is { } from)
        {
            tasks = tasks.Where(t => t.EntryDate >= from);
        }

        if (query.To is { } to)
        {
            tasks = tasks.Where(t => t.EntryDate <= to);
        }

        if (query.Category is { } category)
        {
            tasks = tasks.Where(t => t.Category == category);
        }

        if (query.Status is { } status)
        {
            tasks = tasks.Where(t => t.Status == status);
        }

        if (query.Priority is { } priority)
        {
            tasks = tasks.Where(t => t.Priority == priority);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            tasks = tasks.Where(t =>
                EF.Functions.Like(t.Title, $"%{term}%")
                || (t.Description != null && EF.Functions.Like(t.Description, $"%{term}%"))
            );
        }

        tasks = query.Sort switch
        {
            "entry_date" => tasks.OrderBy(t => t.EntryDate).ThenBy(t => t.Id),
            "title" => tasks.OrderBy(t => t.Title).ThenBy(t => t.Id),
            "-title" => tasks.OrderByDescending(t => t.Title).ThenBy(t => t.Id),
            _ => tasks.OrderByDescending(t => t.EntryDate).ThenByDescending(t => t.Id),
        };

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await tasks.CountAsync(cancellationToken);
        var items = await tasks
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => TaskResponse.From(t))
            .ToListAsync(cancellationToken);

        return new PagedResponse<TaskResponse>(items, page, pageSize, total);
    }

    public async Task<TaskResponse?> GetAsync(
        Caller caller,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (task is null)
        {
            return null;
        }

        var (access, _) = await ResolveScopeAsync(caller, task.UserId, cancellationToken);
        return access == TaskAccess.Allowed ? TaskResponse.From(task) : null;
    }

    public async Task<TaskResponse> CreateAsync(
        int userId,
        CreateTaskRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var task = new TaskEntry
        {
            UserId = userId,
            EntryDate = request.EntryDate,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category,
            Status = request.Status,
            Priority = request.Priority,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(cancellationToken);

        return TaskResponse.From(task);
    }

    public async Task<TaskResponse?> UpdateAsync(
        int userId,
        int id,
        UpdateTaskRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var task = await db.Tasks.FirstOrDefaultAsync(
            t => t.Id == id && t.UserId == userId,
            cancellationToken
        );

        if (task is null)
        {
            return null;
        }

        task.EntryDate = request.EntryDate;
        task.Title = request.Title.Trim();
        task.Description = request.Description?.Trim();
        task.Category = request.Category;
        task.Status = request.Status;
        task.Priority = request.Priority;
        task.UpdatedAt = timeProvider.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken);

        return TaskResponse.From(task);
    }

    public async Task<bool> DeleteAsync(
        int userId,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var deleted = await db
            .Tasks.Where(t => t.Id == id && t.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted > 0;
    }
}
