using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface ITaskService
{
    Task<PagedResult<TaskDto>> GetAsync(TaskQuery query, CancellationToken cancellationToken = default);

    Task<TaskDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    Task<TaskDto> CreateAsync(SaveTaskRequest request, CancellationToken cancellationToken = default);

    Task<TaskDto> UpdateAsync(int id, SaveTaskRequest request, CancellationToken cancellationToken = default);

    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
