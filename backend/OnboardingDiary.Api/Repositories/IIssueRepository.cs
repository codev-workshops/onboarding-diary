using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Repositories;

public interface IIssueRepository : IRepository<IssueEntry>
{
    Task<IEnumerable<IssueEntry>> GetByUserIdAsync(int userId);
    IQueryable<IssueEntry> QueryByDateRange(IQueryable<IssueEntry> query, DateTime? dateFrom, DateTime? dateTo);
    IQueryable<IssueEntry> QueryByStatus(IQueryable<IssueEntry> query, IssueStatus? status);
    IQueryable<IssueEntry> QueryBySeverity(IQueryable<IssueEntry> query, IssueSeverity? severity);
    IQueryable<IssueEntry> QueryByUserId(IQueryable<IssueEntry> query, int? userId);
}
