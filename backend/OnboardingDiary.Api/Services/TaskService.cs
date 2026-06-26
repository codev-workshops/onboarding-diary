using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Tasks;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Extensions;
using OnboardingDiary.Api.Repositories;

namespace OnboardingDiary.Api.Services;

public class TaskService : ITaskService
{
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;

    public TaskService(ITaskRepository taskRepository, IUserRepository userRepository)
    {
        _taskRepository = taskRepository;
        _userRepository = userRepository;
    }

    public async Task<PaginatedResponse<TaskResponseDto>> GetAllAsync(
        int currentUserId,
        UserRole currentUserRole,
        PaginationParams pagination,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? category = null,
        TaskEntryStatus? status = null,
        Priority? priority = null,
        int? userId = null)
    {
        int? filterUserId = currentUserRole switch
        {
            UserRole.Admin => userId,
            UserRole.Manager => userId,
            _ => currentUserId
        };

        if (currentUserRole == UserRole.Manager && userId.HasValue)
        {
            var targetUser = await _userRepository.GetByIdAsync(userId.Value);
            if (targetUser == null || targetUser.ManagerId != currentUserId)
                throw new UnauthorizedAccessException("You can only view tasks of recruits assigned to you.");
        }

        if (currentUserRole == UserRole.Recruit)
            filterUserId = currentUserId;

        var query = _taskRepository.GetFilteredQuery(
            userId: filterUserId,
            dateFrom: dateFrom,
            dateTo: dateTo,
            category: category,
            status: status,
            priority: priority);

        var sortBy = pagination.SortBy ?? "Date";
        query = query.OrderByProperty(sortBy, pagination.SortDescending);

        var paginatedResult = await query
            .Select(t => new TaskResponseDto
            {
                Id = t.Id,
                UserId = t.UserId,
                Date = t.Date,
                Title = t.Title,
                Description = t.Description,
                Category = t.Category,
                Status = t.Status,
                Priority = t.Priority,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .ToPaginatedResponseAsync(pagination);

        return paginatedResult;
    }

    public async Task<TaskResponseDto> GetByIdAsync(int id, int currentUserId, UserRole currentUserRole)
    {
        var task = await _taskRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Task not found.");

        if (currentUserRole == UserRole.Recruit && task.UserId != currentUserId)
            throw new UnauthorizedAccessException("You do not have access to this task.");

        if (currentUserRole == UserRole.Manager && task.UserId != currentUserId)
        {
            var taskOwner = await _userRepository.GetByIdAsync(task.UserId);
            if (taskOwner == null || taskOwner.ManagerId != currentUserId)
                throw new UnauthorizedAccessException("You do not have access to this task.");
        }

        return MapToDto(task);
    }

    public async Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, int currentUserId)
    {
        if (dto.Date.Date > DateTime.UtcNow.Date)
            throw new ArgumentException("Date cannot be in the future.");

        var task = new TaskEntry
        {
            UserId = currentUserId,
            Date = dto.Date,
            Title = dto.Title,
            Description = dto.Description,
            Category = dto.Category,
            Status = dto.Status,
            Priority = dto.Priority,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _taskRepository.AddAsync(task);
        return MapToDto(task);
    }

    public async Task<TaskResponseDto> UpdateAsync(int id, UpdateTaskDto dto, int currentUserId)
    {
        var task = await _taskRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.UserId != currentUserId)
            throw new UnauthorizedAccessException("Only the task owner can update this task.");

        if (dto.Date.HasValue)
        {
            if (dto.Date.Value.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("Date cannot be in the future.");
            task.Date = dto.Date.Value;
        }

        if (dto.Title != null)
            task.Title = dto.Title;

        if (dto.Description != null)
            task.Description = dto.Description;

        if (dto.Category != null)
            task.Category = dto.Category;

        if (dto.Status.HasValue)
            task.Status = dto.Status.Value;

        if (dto.Priority.HasValue)
            task.Priority = dto.Priority.Value;

        task.UpdatedAt = DateTime.UtcNow;

        await _taskRepository.UpdateAsync(task);
        return MapToDto(task);
    }

    public async Task DeleteAsync(int id, int currentUserId)
    {
        var task = await _taskRepository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Task not found.");

        if (task.UserId != currentUserId)
            throw new UnauthorizedAccessException("Only the task owner can delete this task.");

        await _taskRepository.DeleteAsync(task);
    }

    private static TaskResponseDto MapToDto(TaskEntry task)
    {
        return new TaskResponseDto
        {
            Id = task.Id,
            UserId = task.UserId,
            Date = task.Date,
            Title = task.Title,
            Description = task.Description,
            Category = task.Category,
            Status = task.Status,
            Priority = task.Priority,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }
}
