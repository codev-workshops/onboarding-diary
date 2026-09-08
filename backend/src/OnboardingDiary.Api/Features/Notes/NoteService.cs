using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Notes;

public class NoteService(AppDbContext db, EntryScopeService scope, TimeProvider timeProvider)
{
    public async Task<PagedResponse<NoteResponse>> ListAsync(
        int userId,
        NoteListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var notes = db.Notes.AsNoTracking().Include(n => n.Tags).Where(n => n.UserId == userId);

        if (query.From is { } from)
        {
            notes = notes.Where(n => n.EntryDate >= from);
        }

        if (query.To is { } to)
        {
            notes = notes.Where(n => n.EntryDate <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var tag = query.Tag.Trim().ToLowerInvariant();
            notes = notes.Where(n => n.Tags.Any(t => t.Name == tag));
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            notes = notes.Where(n =>
                EF.Functions.Like(n.Title, $"%{term}%") || EF.Functions.Like(n.Content, $"%{term}%")
            );
        }

        notes = notes.OrderByDescending(n => n.EntryDate).ThenByDescending(n => n.Id);

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await notes.CountAsync(cancellationToken);
        var items = await notes.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        return new PagedResponse<NoteResponse>(
            items.Select(NoteResponse.From).ToList(),
            page,
            pageSize,
            total
        );
    }

    public async Task<NoteResponse?> GetAsync(
        Caller caller,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var note = await db
            .Notes.AsNoTracking()
            .Include(n => n.Tags)
            .FirstOrDefaultAsync(n => n.Id == id, cancellationToken);

        if (note is null)
        {
            return null;
        }

        var (access, _) = await scope.ResolveAsync(caller, note.UserId, cancellationToken);
        return access == EntryAccess.Allowed ? NoteResponse.From(note) : null;
    }

    public async Task<NoteResponse> CreateAsync(
        int userId,
        CreateNoteRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var note = new NoteEntry
        {
            UserId = userId,
            EntryDate = request.EntryDate,
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            Tags = NoteTags.Normalise(request.Tags).Select(tag => new NoteTag { Name = tag }).ToList(),
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Notes.Add(note);
        await db.SaveChangesAsync(cancellationToken);

        return NoteResponse.From(note);
    }

    public async Task<NoteResponse?> UpdateAsync(
        int userId,
        int id,
        UpdateNoteRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var note = await db
            .Notes.Include(n => n.Tags)
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken);

        if (note is null)
        {
            return null;
        }

        note.EntryDate = request.EntryDate;
        note.Title = request.Title.Trim();
        note.Content = request.Content.Trim();
        note.UpdatedAt = timeProvider.GetUtcNow();

        var wanted = NoteTags.Normalise(request.Tags);
        note.Tags.RemoveAll(tag => !wanted.Contains(tag.Name));
        foreach (var tag in wanted.Where(tag => note.Tags.TrueForAll(t => t.Name != tag)))
        {
            note.Tags.Add(new NoteTag { Name = tag });
        }

        await db.SaveChangesAsync(cancellationToken);

        return NoteResponse.From(note);
    }

    public async Task<bool> DeleteAsync(
        int userId,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var deleted = await db
            .Notes.Where(n => n.Id == id && n.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted > 0;
    }
}
