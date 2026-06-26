using OnboardingDiary.Api.Entities;

namespace OnboardingDiary.Api.Repositories;

public interface INoteRepository : IRepository<NoteEntry>
{
    Task<NoteEntry?> GetByIdWithTagsAsync(int id);
    IQueryable<NoteEntry> QueryWithTags();
    IQueryable<NoteEntry> QueryByUserId(int userId);
    IQueryable<NoteEntry> QueryByDateRange(IQueryable<NoteEntry> query, DateTime? dateFrom, DateTime? dateTo);
    IQueryable<NoteEntry> QueryByTags(IQueryable<NoteEntry> query, IEnumerable<string> tags);
}
