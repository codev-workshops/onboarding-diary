using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class IssueService : IIssueService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IAccessService _access;

    public IssueService(AppDbContext db, ICurrentUser currentUser, IAccessService access)
    {
        _db = db;
        _currentUser = currentUser;
        _access = access;
    }

    public async Task<PagedResult<IssueDto>> GetAsync(IssueQuery query, CancellationToken cancellationToken = default)
    {
        var userId = await _access.ResolveReadableUserIdAsync(query.RecruitId, cancellationToken);

        var entries = _db.Issues.AsNoTracking().Include(i => i.User).Where(i => i.UserId == userId);

        if (query.From is not null)
        {
            var from = query.From.Value.ToUtcDate();
            entries = entries.Where(i => i.Date >= from);
        }

        if (query.To is not null)
        {
            var to = query.To.Value.ToUtcDate();
            entries = entries.Where(i => i.Date <= to);
        }

        if (query.Severity is not null)
        {
            entries = entries.Where(i => i.Severity == query.Severity);
        }

        if (query.Status is not null)
        {
            entries = entries.Where(i => i.Status == query.Status);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            entries = entries.Where(i => i.Title.Contains(search));
        }

        var total = await entries.CountAsync(cancellationToken);
        var items = await entries
            .OrderByDescending(i => i.Date)
            .ThenByDescending(i => i.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<IssueDto>
        {
            Items = items.Select(Map).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            Total = total
        };
    }

    public async Task<IssueDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Issues
            .AsNoTracking()
            .Include(i => i.User)
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Issue not found.");

        await _access.EnsureCanReadAsync(entry.UserId, cancellationToken);
        return Map(entry);
    }

    public async Task<IssueDto> CreateAsync(SaveIssueRequest request, CancellationToken cancellationToken = default)
    {
        var entry = new IssueEntry
        {
            UserId = _currentUser.Id,
            Date = request.Date.ToUtcDate(),
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Severity = request.Severity,
            Status = request.Status,
            ResolutionNotes = request.ResolutionNotes?.Trim()
        };

        _db.Issues.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);
        await _db.Entry(entry).Reference(i => i.User).LoadAsync(cancellationToken);
        return Map(entry);
    }

    public async Task<IssueDto> UpdateAsync(
        int id,
        SaveIssueRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = await _db.Issues.Include(i => i.User).FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Issue not found.");

        _access.EnsureCanWrite(entry.UserId);

        entry.Date = request.Date.ToUtcDate();
        entry.Title = request.Title.Trim();
        entry.Description = request.Description?.Trim();
        entry.Severity = request.Severity;
        entry.Status = request.Status;
        entry.ResolutionNotes = request.ResolutionNotes?.Trim();
        entry.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return Map(entry);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Issues.FirstOrDefaultAsync(i => i.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Issue not found.");

        _access.EnsureCanWrite(entry.UserId);

        _db.Issues.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public static IssueDto Map(IssueEntry entry) => new()
    {
        Id = entry.Id,
        UserId = entry.UserId,
        UserName = entry.User?.FullName ?? string.Empty,
        Date = entry.Date,
        Title = entry.Title,
        Description = entry.Description,
        Severity = entry.Severity,
        Status = entry.Status,
        ResolutionNotes = entry.ResolutionNotes,
        CreatedAtUtc = entry.CreatedAtUtc,
        UpdatedAtUtc = entry.UpdatedAtUtc
    };
}
