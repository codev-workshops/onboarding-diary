using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class FeedbackService : IFeedbackService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IAccessService _access;

    public FeedbackService(AppDbContext db, ICurrentUser currentUser, IAccessService access)
    {
        _db = db;
        _currentUser = currentUser;
        _access = access;
    }

    public async Task<PagedResult<FeedbackDto>> GetAsync(
        FeedbackQuery query,
        CancellationToken cancellationToken = default)
    {
        var userId = await _access.ResolveReadableUserIdAsync(query.RecruitId, cancellationToken);

        var entries = _db.Feedback.AsNoTracking().Include(f => f.User).Where(f => f.UserId == userId);

        if (query.From is not null)
        {
            var from = query.From.Value.ToUtcDate();
            entries = entries.Where(f => f.Date >= from);
        }

        if (query.To is not null)
        {
            var to = query.To.Value.ToUtcDate();
            entries = entries.Where(f => f.Date <= to);
        }

        if (query.Type is not null)
        {
            entries = entries.Where(f => f.Type == query.Type);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            entries = entries.Where(f => f.Subject.Contains(search));
        }

        var total = await entries.CountAsync(cancellationToken);
        var items = await entries
            .OrderByDescending(f => f.Date)
            .ThenByDescending(f => f.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<FeedbackDto>
        {
            Items = items.Select(Map).ToList(),
            Page = query.Page,
            PageSize = query.PageSize,
            Total = total
        };
    }

    public async Task<FeedbackDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Feedback
            .AsNoTracking()
            .Include(f => f.User)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Feedback note not found.");

        await _access.EnsureCanReadAsync(entry.UserId, cancellationToken);
        return Map(entry);
    }

    public async Task<FeedbackDto> CreateAsync(
        SaveFeedbackRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = new FeedbackNote
        {
            UserId = _currentUser.Id,
            Date = request.Date.ToUtcDate(),
            Subject = request.Subject.Trim(),
            Type = request.Type,
            Details = request.Details?.Trim()
        };

        _db.Feedback.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);
        await _db.Entry(entry).Reference(f => f.User).LoadAsync(cancellationToken);
        return Map(entry);
    }

    public async Task<FeedbackDto> UpdateAsync(
        int id,
        SaveFeedbackRequest request,
        CancellationToken cancellationToken = default)
    {
        var entry = await _db.Feedback.Include(f => f.User).FirstOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Feedback note not found.");

        _access.EnsureCanWrite(entry.UserId);

        entry.Date = request.Date.ToUtcDate();
        entry.Subject = request.Subject.Trim();
        entry.Type = request.Type;
        entry.Details = request.Details?.Trim();
        entry.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return Map(entry);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.Feedback.FirstOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw AppException.NotFound("Feedback note not found.");

        _access.EnsureCanWrite(entry.UserId);

        _db.Feedback.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public static FeedbackDto Map(FeedbackNote entry) => new()
    {
        Id = entry.Id,
        UserId = entry.UserId,
        UserName = entry.User?.FullName ?? string.Empty,
        Date = entry.Date,
        Subject = entry.Subject,
        Type = entry.Type,
        Details = entry.Details,
        CreatedAtUtc = entry.CreatedAtUtc,
        UpdatedAtUtc = entry.UpdatedAtUtc
    };
}
