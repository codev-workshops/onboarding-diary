using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Issues;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Issues;

public class IssueRepository : IIssueRepository
{
    private readonly AppDbContext _context;

    public IssueRepository(AppDbContext context)
    {
        _context = context;
    }

    public IQueryable<Issue> Query() => _context.Issues.AsNoTracking();

    public async Task<Issue?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.Issues.FirstOrDefaultAsync(i => i.Id == id, ct);

    public void Add(Issue entity) => _context.Issues.Add(entity);

    public void Update(Issue entity) => _context.Issues.Update(entity);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
