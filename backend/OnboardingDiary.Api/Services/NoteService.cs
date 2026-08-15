using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class NoteService : INoteService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IAccessService _access;

    public NoteService(AppDbContext db, ICurrentUser currentUser, IAccessService access)
    {
        _db = db;
        _currentUser = currentUser;
        _access = access;
    }

    public async Task<PagedResult<NoteDto>> GetAsync(NoteQuery query, CancellationToken cancellationToken = default)
    {
        var userId = await _access.ResolveReadableUserIdAsync(query.RecruitId, cancellationToken);

        var entries = _db.Notes.AsNoTracking().Include(n => n.User).Where(n => n.UserId == userId);

        if (query.From is not null)
        {
            var from = query.From.Value.ToUtcDate();
            entries = entries.Where(n => n.Date >= from);
        }

        if (query.To is not null)
        {
            var to = query.To.Value.ToUtcDate();
            entries = entries.Where(n => n.Date <= to);
        }

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var tag = query.Tag.Trim();
            entries = entries.Where(n => n.Tags.Contains(tag));
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            entries = entries.Where(n => n.Title.Contains(search));
        }

        var total = await entries.CountAsync(cancellationToken);
        var items = await entries
            .OrderByDescending(n => n.Date)
            .ThenByDescending(n => n.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<NoteDto>
        {
            Items = items.Select(Map).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            Total = total
        };
    }

    public async Task<NoteDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Notes
            .AsNoTracking()
            .Include(n => n.User)
            .FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Note not found.");

        await _access.EnsureCanReadAsync(entry.UserId, cancellationToken);
        return Map(entry);
    }

    public async Task<NoteDto> CreateAsync(SaveNoteRequest request, CancellationToken cancellationToken = default)
    {
        var entry = new AdditionalNote
        {
            UserId = _currentUser.Id,
            Date = request.Date.ToUtcDate(),
            Title = request.Title.Trim(),
            Content = request.Content?.Trim(),
            Tags = JoinTags(request.Tags)
        };

        _db.Notes.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);
        await _db.Entry(entry).Reference(n => n.User).LoadAsync(cancellationToken);
        return Map(entry);
    }

    public async Task<NoteDto> UpdateAsync(
        int id,
        SaveNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = await _db.Notes.Include(n => n.User).FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Note not found.");

        _access.EnsureCanWrite(entry.UserId);

        entry.Date = request.Date.ToUtcDate();
        entry.Title = request.Title.Trim();
        entry.Content = request.Content?.Trim();
        entry.Tags = JoinTags(request.Tags);
        entry.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return Map(entry);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Notes.FirstOrDefaultAsync(n => n.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Note not found.");

        _access.EnsureCanWrite(entry.UserId);

        _db.Notes.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public static string JoinTags(IEnumerable<string> tags) => string.Join(
        ',',
        tags.Select(t => t.Trim()).Where(t => t.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase));

    public static IReadOnlyList<string> SplitTags(string tags) =>
        tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static NoteDto Map(AdditionalNote entry) => new()
    {
        Id = entry.Id,
        UserId = entry.UserId,
        UserName = entry.User?.FullName ?? string.Empty,
        Date = entry.Date,
        Title = entry.Title,
        Content = entry.Content,
        Tags = SplitTags(entry.Tags),
        CreatedAtUtc = entry.CreatedAtUtc,
        UpdatedAtUtc = entry.UpdatedAtUtc
    };
}
