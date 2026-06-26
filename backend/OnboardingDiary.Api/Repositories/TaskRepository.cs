using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public class TaskRepository : Repository<TaskEntry>, ITaskRepository
{
    public TaskRepository(AppDbContext context) : base(context) { }

    public IQueryable<TaskEntry> GetFilteredQuery(
        int? userId = null,
        DateTime? dateFrom = null,
        DateTime? dateTo = null,
        string? category = null,
        TaskEntryStatus? status = null,
        Priority? priority = null)
    {
        var query = Query();

        if (userId.HasValue)
            query = query.Where(t => t.UserId == userId.Value);

        if (dateFrom.HasValue)
            query = query.Where(t => t.Date >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(t => t.Date <= dateTo.Value);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(t => t.Category == category);

        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);

        if (priority.HasValue)
            query = query.Where(t => t.Priority == priority.Value);

        return query;
    }
}
