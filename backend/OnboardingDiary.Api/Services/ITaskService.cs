using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Tasks;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Services;

public interface ITaskService
{
    Task<PaginatedResponse<TaskResponseDto>> GetAllAsync(
        int currentUserId,
        UserRole currentUserRole,
        PaginationParams pagination,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? category = null,
        TaskEntryStatus? status = null,
        Priority? priority = null,
        int? userId = null);

    Task<TaskResponseDto> GetByIdAsync(int id, int currentUserId, UserRole currentUserRole);
    Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, int currentUserId);
    Task<TaskResponseDto> UpdateAsync(int id, UpdateTaskDto dto, int currentUserId);
    Task DeleteAsync(int id, int currentUserId);
}
