using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public class IssueRepository : Repository<IssueEntry>, IIssueRepository
{
    public IssueRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<IssueEntry>> GetByUserIdAsync(int userId)
    {
        return await DbSet
            .Include(i => i.User)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.Date)
            .ToListAsync();
    }

    public IQueryable<IssueEntry> QueryByDateRange(IQueryable<IssueEntry> query, DateTime? dateFrom, DateTime? dateTo)
    {
        if (dateFrom.HasValue)
            query = query.Where(i => i.Date >= dateFrom.Value);
        if (dateTo.HasValue)
            query = query.Where(i => i.Date <= dateTo.Value);
        return query;
    }

    public IQueryable<IssueEntry> QueryByStatus(IQueryable<IssueEntry> query, IssueStatus? status)
    {
        if (status.HasValue)
            query = query.Where(i => i.Status == status.Value);
        return query;
    }

    public IQueryable<IssueEntry> QueryBySeverity(IQueryable<IssueEntry> query, IssueSeverity? severity)
    {
        if (severity.HasValue)
            query = query.Where(i => i.Severity == severity.Value);
        return query;
    }

    public IQueryable<IssueEntry> QueryByUserId(IQueryable<IssueEntry> query, int? userId)
    {
        if (userId.HasValue)
            query = query.Where(i => i.UserId == userId.Value);
        return query;
    }
}
