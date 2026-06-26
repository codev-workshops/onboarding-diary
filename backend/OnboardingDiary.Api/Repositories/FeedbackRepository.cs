using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public class FeedbackRepository : Repository<FeedbackEntry>, IFeedbackRepository
{
    private readonly AppDbContext _context;

    public FeedbackRepository(AppDbContext context) : base(context)
    {
        _context = context;
    }

    public IQueryable<FeedbackEntry> GetByUserId(int userId)
    {
        return Query().Where(f => f.UserId == userId);
    }

    public IQueryable<FeedbackEntry> GetByManagerId(int managerId)
    {
        return Query().Where(f => f.User.ManagerId == managerId);
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

    public async Task<bool> IsUserManagedByAsync(int entryUserId, int managerId)
    {
        return await _context.Users.AnyAsync(u => u.Id == entryUserId && u.ManagerId == managerId);
    }
}
