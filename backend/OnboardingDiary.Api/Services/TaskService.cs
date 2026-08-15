using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IAccessService _access;

    public TaskService(AppDbContext db, ICurrentUser currentUser, IAccessService access)
    {
        _db = db;
        _currentUser = currentUser;
        _access = access;
    }

    public async Task<PagedResult<TaskDto>> GetAsync(TaskQuery query, CancellationToken cancellationToken = default)
    {
        var userId = await _access.ResolveReadableUserIdAsync(query.RecruitId, cancellationToken);

        var entries = _db.Tasks.AsNoTracking().Include(t => t.User).Where(t => t.UserId == userId);

        if (query.From is not null)
        {
            var from = query.From.Value.ToUtcDate();
            entries = entries.Where(t => t.Date >= from);
        }

        if (query.To is not null)
        {
            var to = query.To.Value.ToUtcDate();
            entries = entries.Where(t => t.Date <= to);
        }

        if (query.Category is not null)
        {
            entries = entries.Where(t => t.Category == query.Category);
        }

        if (query.Status is not null)
        {
            entries = entries.Where(t => t.Status == query.Status);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            entries = entries.Where(t => t.Title.Contains(search));
        }

        var total = await entries.CountAsync(cancellationToken);
        var items = await entries
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<TaskDto>
        {
            Items = items.Select(Map).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            Total = total
        };
    }

    public async Task<TaskDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Tasks
            .AsNoTracking()
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Task not found.");

        await _access.EnsureCanReadAsync(entry.UserId, cancellationToken);
        return Map(entry);
    }

    public async Task<TaskDto> CreateAsync(SaveTaskRequest request, CancellationToken cancellationToken = default)
    {
        var entry = new TaskEntry
        {
            UserId = _currentUser.Id,
            Date = request.Date.ToUtcDate(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category,
            Status = request.Status,
            Priority = request.Priority
        };

        _db.Tasks.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);
        await _db.Entry(entry).Reference(t => t.User).LoadAsync(cancellationToken);
        return Map(entry);
    }

    public async Task<TaskDto> UpdateAsync(
        int id,
        SaveTaskRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = await _db.Tasks.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Task not found.");

        _access.EnsureCanWrite(entry.UserId);

        entry.Date = request.Date.ToUtcDate();
        entry.Title = request.Title.Trim();
        entry.Description = request.Description?.Trim();
        entry.Category = request.Category;
        entry.Status = request.Status;
        entry.Priority = request.Priority;
        entry.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return Map(entry);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Tasks.FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Task not found.");

        _access.EnsureCanWrite(entry.UserId);

        _db.Tasks.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public static TaskDto Map(TaskEntry entry) => new()
    {
        Id = entry.Id,
        UserId = entry.UserId,
        UserName = entry.User?.FullName ?? string.Empty,
        Date = entry.Date,
        Title = entry.Title,
        Description = entry.Description,
        Category = entry.Category,
        Status = entry.Status,
        Priority = entry.Priority,
        CreatedAtUtc = entry.CreatedAtUtc,
        UpdatedAtUtc = entry.UpdatedAtUtc
    };
}
