using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Entities;

namespace OnboardingDiary.Api.Repositories;

public class NoteRepository : Repository<NoteEntry>, INoteRepository
{
    public NoteRepository(AppDbContext context) : base(context) { }

    public async Task<NoteEntry?> GetByIdWithTagsAsync(int id)
    {
        return await DbSet
            .Include(n => n.Tags)
            .FirstOrDefaultAsync(n => n.Id == id);
    }

    public IQueryable<NoteEntry> QueryWithTags()
    {
        return DbSet.Include(n => n.Tags);
    }

    public IQueryable<NoteEntry> QueryByUserId(int userId)
    {
        return QueryWithTags().Where(n => n.UserId == userId);
    }

    public IQueryable<NoteEntry> QueryByDateRange(IQueryable<NoteEntry> query, DateTime? dateFrom, DateTime? dateTo)
    {
        if (dateFrom.HasValue)
            query = query.Where(n => n.Date >= dateFrom.Value);
        if (dateTo.HasValue)
            query = query.Where(n => n.Date <= dateTo.Value);
        return query;
    }

    public IQueryable<NoteEntry> QueryByTags(IQueryable<NoteEntry> query, IEnumerable<string> tags)
    {
        var tagList = tags.Select(t => t.ToLower()).ToList();
        if (tagList.Count == 0)
            return query;
        return query.Where(n => n.Tags.Any(nt => tagList.Contains(nt.Tag)));
    }
}
