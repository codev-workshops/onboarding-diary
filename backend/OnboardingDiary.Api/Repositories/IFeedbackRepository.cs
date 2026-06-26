using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public interface IFeedbackRepository : IRepository<FeedbackEntry>
{
    IQueryable<FeedbackEntry> GetByUserId(int userId);
    IQueryable<FeedbackEntry> GetByDateRange(IQueryable<FeedbackEntry> query, DateTime? dateFrom, DateTime? dateTo);
    IQueryable<FeedbackEntry> GetByType(IQueryable<FeedbackEntry> query, FeedbackType? type);
}
