using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Issues;

public interface IIssueRepository
{
    IQueryable<Issue> Query();
    Task<Issue?> GetByIdAsync(Guid id, CancellationToken ct = default);
    void Add(Issue entity);
    void Update(Issue entity);
    Task SaveChangesAsync(CancellationToken ct = default);
}
