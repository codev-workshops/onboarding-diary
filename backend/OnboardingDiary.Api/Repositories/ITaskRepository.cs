using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public interface ITaskRepository : IRepository<TaskEntry>
{
    IQueryable<TaskEntry> GetFilteredQuery(
        int? userId = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? category = null,
        TaskEntryStatus? status = null,
        Priority? priority = null);
}
