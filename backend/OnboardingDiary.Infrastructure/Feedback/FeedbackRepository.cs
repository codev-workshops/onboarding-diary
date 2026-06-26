using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Feedback;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Feedback;

public class FeedbackRepository : IFeedbackRepository
{
    private readonly AppDbContext _context;

    public FeedbackRepository(AppDbContext context)
    {
        _context = context;
    }

    public IQueryable<Domain.Entities.Feedback> Query() => _context.Feedbacks.AsNoTracking();

    public async Task<Domain.Entities.Feedback?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.Feedbacks.FirstOrDefaultAsync(f => f.Id == id, ct);

    public void Add(Domain.Entities.Feedback entity) => _context.Feedbacks.Add(entity);

    public void Update(Domain.Entities.Feedback entity) => _context.Feedbacks.Update(entity);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
