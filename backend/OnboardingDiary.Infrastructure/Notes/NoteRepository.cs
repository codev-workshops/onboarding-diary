using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Notes;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Notes;

public class NoteRepository : INoteRepository
{
    private readonly AppDbContext _context;

    public NoteRepository(AppDbContext context)
    {
        _context = context;
    }

    public IQueryable<Note> Query() => _context.Notes.AsNoTracking();

    public async Task<Note?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _context.Notes.FirstOrDefaultAsync(n => n.Id == id, ct);

    public void Add(Note entity) => _context.Notes.Add(entity);

    public void Update(Note entity) => _context.Notes.Update(entity);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _context.SaveChangesAsync(ct);
}
