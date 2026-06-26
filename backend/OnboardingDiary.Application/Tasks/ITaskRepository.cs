using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Tasks;

public interface ITaskRepository
{
    IQueryable<TaskEntity> Query();
    Task<TaskEntity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    void Add(TaskEntity entity);
    void Update(TaskEntity entity);
    Task SaveChangesAsync(CancellationToken ct = default);
}
