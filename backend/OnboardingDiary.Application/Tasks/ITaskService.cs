using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Tasks.Dtos;

namespace OnboardingDiary.Application.Tasks;

public interface ITaskService
{
    Task<PagedResult<TaskDto>> ListAsync(TaskListQuery query, CancellationToken ct = default);
    Task<TaskDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<TaskDto> CreateAsync(CreateTaskRequest request, CancellationToken ct = default);
    Task<TaskDto?> UpdateAsync(Guid id, UpdateTaskRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct = default);
    Task<TaskStatsDto> GetStatsAsync(Guid? recruitId, CancellationToken ct = default);
}
