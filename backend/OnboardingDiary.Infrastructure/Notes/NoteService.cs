using Mapster;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Common.Security;
using OnboardingDiary.Application.Notes;
using OnboardingDiary.Application.Notes.Dtos;
using OnboardingDiary.Domain.Entities;

namespace OnboardingDiary.Infrastructure.Notes;

public class NoteService : INoteService
{
    private readonly INoteRepository _repository;
    private readonly ICurrentUser _currentUser;
    private readonly ISanitizer _sanitizer;
    private const int MaxPinnedNotes = 5;

    public NoteService(INoteRepository repository, ICurrentUser currentUser, ISanitizer sanitizer)
    {
        _repository = repository;
        _currentUser = currentUser;
        _sanitizer = sanitizer;
    }

    public async Task<NoteDto> CreateAsync(CreateNoteRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        if (request.IsPinned)
        {
            var pinnedCount = await _repository.Query()
                .CountAsync(n => n.UserId == userId && n.IsPinned, ct);
            if (pinnedCount >= MaxPinnedNotes)
                throw new InvalidOperationException("Maximum of 5 pinned notes reached. Unpin a note before pinning another.");
        }

        var entity = new Note
        {
            UserId = userId,
            Date = request.Date,
            Title = _sanitizer.Sanitize(request.Title.Trim()),
            Content = _sanitizer.Sanitize(request.Content),
            Tags = (request.Tags ?? new List<string>()).Select(t => _sanitizer.Sanitize(t)).ToList(),
            IsPinned = request.IsPinned,
        };

        _repository.Add(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<NoteDto>();
    }

    public async Task<PagedResult<NoteDto>> ListAsync(NoteListQuery query, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var q = _repository.Query().Where(n => n.UserId == userId);

        // Apply date range filters (translatable to SQL)
        if (query.StartDate.HasValue)
            q = q.Where(n => n.Date >= query.StartDate.Value);
        if (query.EndDate.HasValue)
            q = q.Where(n => n.Date <= query.EndDate.Value);

        // Apply title/content search at DB level
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            q = q.Where(n =>
                n.Title.ToLower().Contains(search) ||
                n.Content.ToLower().Contains(search));
        }

        // Materialize filtered results, then apply tag-based filters client-side.
        // Tags is a JSON value-converted List<string>; LINQ .Any() on it is not
        // reliably translatable across all EF providers. For production with SQL
        // Server, consider raw SQL or full-text indexing on the Tags column.
        var allFiltered = await q
            .OrderByDescending(n => n.IsPinned)
            .ThenByDescending(n => n.Date)
            .ThenByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

        IEnumerable<Note> results = allFiltered;

        // Tag search: include notes where any tag matches the search term
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            // Re-include any notes from the full user set that match by tag but
            // were excluded by the title/content filter above
            var allUserNotes = await _repository.Query()
                .Where(n => n.UserId == userId)
                .Where(n => query.StartDate == null || n.Date >= query.StartDate.Value)
                .Where(n => query.EndDate == null || n.Date <= query.EndDate.Value)
                .ToListAsync(ct);

            var tagMatches = allUserNotes
                .Where(n => n.Tags.Any(t => t.ToLower().Contains(search)))
                .Where(n => !allFiltered.Any(f => f.Id == n.Id));

            results = allFiltered.Concat(tagMatches)
                .OrderByDescending(n => n.IsPinned)
                .ThenByDescending(n => n.Date)
                .ThenByDescending(n => n.CreatedAt);
        }

        // Tag filter: match notes containing any of the specified tags
        if (!string.IsNullOrWhiteSpace(query.Tags))
        {
            var filterTags = query.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(t => t.ToLower())
                .ToList();

            results = results.Where(n => n.Tags.Any(t => filterTags.Contains(t.ToLower())));
        }

        var materialized = results.ToList();
        var total = materialized.Count;

        var (page, limit) = PaginationParams.Normalize(query.Page, query.Limit);

        var items = materialized
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        return new PagedResult<NoteDto>
        {
            Items = items.Adapt<List<NoteDto>>(),
            Total = total,
            Page = page,
            PageSize = limit,
            TotalPages = (int)Math.Ceiling((double)total / limit)
        };
    }

    public async Task<NoteDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.Query().FirstOrDefaultAsync(n => n.Id == id, ct);
        if (entity is null || entity.UserId != userId)
            return null;

        return entity.Adapt<NoteDto>();
    }

    public async Task<NoteDto?> UpdateAsync(Guid id, UpdateNoteRequest request, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null || entity.UserId != userId)
            return null;

        if (!entity.IsPinned && request.IsPinned)
        {
            var pinnedCount = await _repository.Query()
                .CountAsync(n => n.UserId == userId && n.IsPinned, ct);
            if (pinnedCount >= MaxPinnedNotes)
                throw new InvalidOperationException("Maximum of 5 pinned notes reached. Unpin a note before pinning another.");
        }

        entity.Title = _sanitizer.Sanitize(request.Title.Trim());
        entity.Content = _sanitizer.Sanitize(request.Content);
        entity.Tags = (request.Tags ?? new List<string>()).Select(t => _sanitizer.Sanitize(t)).ToList();
        entity.IsPinned = request.IsPinned;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return entity.Adapt<NoteDto>();
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("User is not authenticated.");

        var entity = await _repository.GetByIdAsync(id, ct);
        if (entity is null || entity.UserId != userId)
            return false;

        entity.IsDeleted = true;
        _repository.Update(entity);
        await _repository.SaveChangesAsync(ct);

        return true;
    }
}
