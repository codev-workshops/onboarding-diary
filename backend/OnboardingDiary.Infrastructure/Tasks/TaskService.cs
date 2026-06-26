using Mapster;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Common.Security;
using OnboardingDiary.Application.Tasks;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Infrastructure.Tasks;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly AppDbContext _context;
    private readonly ISanitizer _sanitizer;

    public TaskService(ITaskRepository repository, ICurrentUser currentUser, AppDbContext context, ISanitizer sanitizer)
    {
        _repository = repository;
        _currentUser = currentUser;
        _context = context;
        _sanitizer = sanitizer;
    }

    public async Task<TaskDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = new TaskEntity
        {
            UserId = userId,
            Date = request.Date,
            Title = _sanitizer.Sanitize(request.Title.Trim()),
            Description = request.Description is not null ? _sanitizer.Sanitize(request.Description) : null,
            Category = request.Category,
            Status = request.Status,
            Priority = request.Priority,
        };

        if (request.Status == TaskStatus.Completed)
            entity.CompletedAt = DateTime.UtcNow;

        _repository.Add(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<TaskDto>();
    }

    public async Task<PagedResult<TaskDto>> ListAsync(TaskListQuery query, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var q = _repository.Query();

        if (role == nameof(Role.Admin))
        {
            if (query.RecruitId.HasValue)
                q = q.Where(t => t.UserId == query.RecruitId.Value);
        }
        else if (role == nameof(Role.Manager))
        {
            if (query.RecruitId.HasValue)
            {
                var recruit = await _context.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == query.RecruitId.Value, ct);
                if (recruit is null || recruit.ManagerId != userId)
                    throw new ForbiddenException("You do not have access to this recruit's tasks.");
                q = q.Where(t => t.UserId == query.RecruitId.Value);
            }
            else
            {
                q = q.Where(t => t.UserId == userId);
            }
        }
        else
        {
            q = q.Where(t => t.UserId == userId);
        }

        if (query.StartDate.HasValue)
            q = q.Where(t => t.Date >= query.StartDate.Value);
        if (query.EndDate.HasValue)
            q = q.Where(t => t.Date <= query.EndDate.Value);
        if (query.Category.HasValue)
            q = q.Where(t => t.Category == query.Category.Value);
        if (query.Status.HasValue)
            q = q.Where(t => t.Status == query.Status.Value);
        if (query.Priority.HasValue)
            q = q.Where(t => t.Priority == query.Priority.Value);

        var total = await q.CountAsync(ct);

        var (page, limit) = PaginationParams.Normalize(query.Page, query.Limit);

        var items = await q
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync(ct);

        return new PagedResult<TaskDto>
        {
            Items = items.Adapt<List<TaskDto>>(),
            Total = total,
            Page = page,
            PageSize = limit,
            TotalPages = (int)Math.Ceiling((double)total / limit)
        };
    }

    public async Task<TaskDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var entity = await _repository.Query().FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity is null) return null;

        if (role == nameof(Role.Admin))
            return entity.Adapt<TaskDto>();

        if (entity.UserId == userId)
            return entity.Adapt<TaskDto>();

        if (role == nameof(Role.Manager))
        {
            var recruit = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == entity.UserId, ct);
            if (recruit is not null && recruit.ManagerId == userId)
                return entity.Adapt<TaskDto>();
        }

        return null;
    }

    public async Task<TaskDto?> UpdateAsync(Guid id, UpdateTaskRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null || entity.UserId != userId)
            return null;

        var previousStatus = entity.Status;

        entity.Date = request.Date;
        entity.Title = _sanitizer.Sanitize(request.Title.Trim());
        entity.Description = request.Description is not null ? _sanitizer.Sanitize(request.Description) : null;
        entity.Category = request.Category;
        entity.Status = request.Status;
        entity.Priority = request.Priority;

        if (request.Status == TaskStatus.Completed && previousStatus != TaskStatus.Completed)
            entity.CompletedAt = DateTime.UtcNow;
        else if (request.Status != TaskStatus.Completed)
            entity.CompletedAt = null;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<TaskDto>();
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null) return false;

        if (entity.UserId != userId && role != nameof(Role.Admin))
            return false;

        entity.IsDeleted = true;
        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return true;
    }

    public async Task<TaskStatsDto> GetStatsAsync(Guid? recruitId, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");
        var role = _currentUser.Role;

        Guid targetUserId;

        if (recruitId.HasValue)
        {
            if (role == nameof(Role.Admin))
            {
                targetUserId = recruitId.Value;
            }
            else if (role == nameof(Role.Manager))
            {
                var recruit = await _context.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == recruitId.Value, ct);
                if (recruit is null || recruit.ManagerId != userId)
                    throw new ForbiddenException("You do not have access to this recruit's stats.");
                targetUserId = recruitId.Value;
            }
            else
            {
                targetUserId = userId;
            }
        }
        else
        {
            targetUserId = userId;
        }

        var tasks = await _repository.Query()
            .Where(t => t.UserId == targetUserId)
            .Select(t => t.Status)
            .ToListAsync(ct);

        var total = tasks.Count;
        var completed = tasks.Count(s => s == TaskStatus.Completed);
        var inProgress = tasks.Count(s => s == TaskStatus.InProgress);
        var pending = tasks.Count(s => s == TaskStatus.NotStarted);
        var rate = total > 0 ? Math.Round((double)completed / total * 100, 2) : 0;

        return new TaskStatsDto(total, completed, inProgress, pending, rate);
    }
}
