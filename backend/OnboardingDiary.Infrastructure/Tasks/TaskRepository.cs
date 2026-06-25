using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Tasks;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Tasks;

public class TaskRepository : ITaskRepository
{
    private readonly AppDbContext _context;

    public TaskRepository(AppDbContext context)
    {
        _context = context;
    }

    public IQueryable<TaskEntity> Query() => _context.Tasks.AsNoTracking();

    public async Task<TaskEntity?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);

    public void Add(TaskEntity entity) => _context.Tasks.Add(entity);

    public void Update(TaskEntity entity) => _context.Tasks.Update(entity);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
