using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public class FeedbackRepository : Repository<FeedbackEntry>, IFeedbackRepository
{
    public FeedbackRepository(AppDbContext context) : base(context)
    {
    }

    public IQueryable<FeedbackEntry> GetByUserId(int userId)
    {
        return Query().Where(f => f.UserId == userId);
    }

    public IQueryable<FeedbackEntry> GetByDateRange(IQueryable<FeedbackEntry> query, DateTime? dateFrom, DateTime? dateTo)
    {
        if (dateFrom.HasValue)
            query = query.Where(f => f.Date >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(f => f.Date <= dateTo.Value);

        return query;
    }

    public IQueryable<FeedbackEntry> GetByType(IQueryable<FeedbackEntry> query, FeedbackType? type)
    {
        if (type.HasValue)
            query = query.Where(f => f.Type == type.Value);

        return query;
    }
}
