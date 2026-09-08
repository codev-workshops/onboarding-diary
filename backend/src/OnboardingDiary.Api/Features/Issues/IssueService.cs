using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Issues;

public enum IssueUpdateOutcome
{
    Updated,
    NotFound,
    InvalidTransition,
}

public class IssueService(AppDbContext db, EntryScopeService scope, TimeProvider timeProvider)
{
    public async Task<PagedResponse<IssueResponse>> ListAsync(
        int userId,
        IssueListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var issues = db.Issues.AsNoTracking().Where(i => i.UserId == userId);

        if (query.From is { } from)
        {
            issues = issues.Where(i => i.EntryDate >= from);
        }

        if (query.To is { } to)
        {
            issues = issues.Where(i => i.EntryDate <= to);
        }

        if (query.Severity is { } severity)
        {
            issues = issues.Where(i => i.Severity == severity);
        }

        if (query.Status is { } status)
        {
            issues = issues.Where(i => i.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            issues = issues.Where(i =>
                EF.Functions.Like(i.Title, $"%{term}%")
                || (i.Description != null && EF.Functions.Like(i.Description, $"%{term}%"))
            );
        }

        issues = issues.OrderByDescending(i => i.EntryDate).ThenByDescending(i => i.Id);

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await issues.CountAsync(cancellationToken);
        var items = await issues
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => IssueResponse.From(i))
            .ToListAsync(cancellationToken);

        return new PagedResponse<IssueResponse>(items, page, pageSize, total);
    }

    public async Task<IssueResponse?> GetAsync(
        Caller caller,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var issue = await db.Issues.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (issue is null)
        {
            return null;
        }

        var (access, _) = await scope.ResolveAsync(caller, issue.UserId, cancellationToken);
        return access == EntryAccess.Allowed ? IssueResponse.From(issue) : null;
    }

    public async Task<IssueResponse> CreateAsync(
        int userId,
        CreateIssueRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var issue = new IssueEntry
        {
            UserId = userId,
            EntryDate = request.EntryDate,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Severity = request.Severity,
            Status = IssueStatus.Open,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Issues.Add(issue);
        await db.SaveChangesAsync(cancellationToken);

        return IssueResponse.From(issue);
    }

    public async Task<(IssueUpdateOutcome Outcome, IssueResponse? Issue)> UpdateAsync(
        int userId,
        int id,
        UpdateIssueRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var issue = await db.Issues.FirstOrDefaultAsync(
            i => i.Id == id && i.UserId == userId,
            cancellationToken
        );

        if (issue is null)
        {
            return (IssueUpdateOutcome.NotFound, null);
        }

        if (!IssueTransitions.CanMove(issue.Status, request.Status))
        {
            return (IssueUpdateOutcome.InvalidTransition, null);
        }

        var now = timeProvider.GetUtcNow();

        issue.EntryDate = request.EntryDate;
        issue.Title = request.Title.Trim();
        issue.Description = request.Description?.Trim();
        issue.Severity = request.Severity;
        issue.ResolutionNotes = request.ResolutionNotes?.Trim();
        issue.UpdatedAt = now;

        if (
            IssueTransitions.RequiresResolutionNotes(request.Status)
            && !IssueTransitions.RequiresResolutionNotes(issue.Status)
        )
        {
            issue.ResolvedAt = now;
        }
        else if (!IssueTransitions.RequiresResolutionNotes(request.Status))
        {
            issue.ResolvedAt = null;
            issue.ResolutionNotes = null;
        }

        issue.Status = request.Status;

        await db.SaveChangesAsync(cancellationToken);

        return (IssueUpdateOutcome.Updated, IssueResponse.From(issue));
    }

    public async Task<bool> DeleteAsync(
        int userId,
        int id,
        CancellationToken cancellationToken = default
    )
    {
        var deleted = await db
            .Issues.Where(i => i.Id == id && i.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted > 0;
    }
}
