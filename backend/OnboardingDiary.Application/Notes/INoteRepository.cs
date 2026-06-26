using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Application.Notes;

public interface INoteRepository
{
    IQueryable<Note> Query();
    Task<Note?> GetByIdAsync(Guid id, CancellationToken ct = default);
    void Add(Note entity);
    void Update(Note entity);
    Task SaveChangesAsync(CancellationToken ct = default);
}
