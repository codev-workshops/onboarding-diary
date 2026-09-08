using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Feedback;

public class FeedbackService(AppDbContext db, EntryScopeService scope, TimeProvider timeProvider)
{
    public async Task<PagedResponse<FeedbackResponse>> ListAsync(
        int userId,
        FeedbackListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var feedback = db.Feedback.AsNoTracking().Where(f => f.UserId == userId);

        if (query.From is { } from)
        {
            feedback = feedback.Where(f => f.EntryDate >= from);
        }

        if (query.To is { } to)
        {
            feedback = feedback.Where(f => f.EntryDate <= to);
        }

        if (query.Type is { } type)
        {
            feedback = feedback.Where(f => f.Type == type);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            feedback = feedback.Where(f =>
                EF.Functions.Like(f.Title, $"%{term}%") || EF.Functions.Like(f.Message, $"%{term}%")
            );
        }

        feedback = feedback.OrderByDescending(f => f.EntryDate).ThenByDescending(f => f.Id);

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await feedback.CountAsync(cancellationToken);
        var items = await feedback
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => FeedbackResponse.From(f))
            .ToListAsync(cancellationToken);

        return new PagedResponse<FeedbackResponse>(items, page, pageSize, total);
    }

    public async Task<FeedbackResponse?> GetAsync(
        Caller caller,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var feedback = await db.Feedback.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
        if (feedback is null)
        {
            return null;
        }

        var (access, _) = await scope.ResolveAsync(caller, feedback.UserId, cancellationToken);
        return access == EntryAccess.Allowed ? FeedbackResponse.From(feedback) : null;
    }

    public async Task<FeedbackResponse> CreateAsync(
        int userId,
        CreateFeedbackRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var feedback = new FeedbackEntry
        {
            UserId = userId,
            EntryDate = request.EntryDate,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            Type = request.Type,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Feedback.Add(feedback);
        await db.SaveChangesAsync(cancellationToken);

        return FeedbackResponse.From(feedback);
    }

    public async Task<FeedbackResponse?> UpdateAsync(
        int userId,
        int id,
        UpdateFeedbackRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var feedback = await db.Feedback.FirstOrDefaultAsync(
            f => f.Id == id && f.UserId == userId,
            cancellationToken
        );

        if (feedback is null)
        {
            return null;
        }

        feedback.EntryDate = request.EntryDate;
        feedback.Title = request.Title.Trim();
        feedback.Message = request.Message.Trim();
        feedback.Type = request.Type;
        feedback.UpdatedAt = timeProvider.GetUtcNow();

        await db.SaveChangesAsync(cancellationToken);

        return FeedbackResponse.From(feedback);
    }

    public async Task<bool> DeleteAsync(
        int userId,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var deleted = await db
            .Feedback.Where(f => f.Id == id && f.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted > 0;
    }
}
