using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Dashboard;

public class DashboardService(AppDbContext db)
{
    public const int RecentTaskCount = 5;

    public const int RecentActivityCount = 10;

    public async Task<DashboardResponse> GetAsync(
        int userId,
        CancellationToken cancellationToken = default
    )
    {
        var tasks = db.Tasks.AsNoTracking().Where(t => t.UserId == userId);
        var issues = db.Issues.AsNoTracking().Where(i => i.UserId == userId);
        var feedback = db.Feedback.AsNoTracking().Where(f => f.UserId == userId);
        var notes = db.Notes.AsNoTracking().Where(n => n.UserId == userId);

        var total = await tasks.CountAsync(cancellationToken);
        var done = await tasks.CountAsync(t => t.Status == TaskEntryStatus.Done, cancellationToken);

        var recentTasks = await tasks
            .OrderByDescending(t => t.EntryDate)
            .ThenByDescending(t => t.Id)
            .Take(RecentTaskCount)
            .Select(t => TaskResponse.From(t))
            .ToListAsync(cancellationToken);

        var openIssues = issues.Where(i =>
            i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress
        );

        var openBySeverity = await openIssues
            .GroupBy(i => i.Severity)
            .Select(group => new { Severity = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.Severity, row => row.Count, cancellationToken);

        var issueSummary = new IssueSummary(
            await issues.CountAsync(cancellationToken),
            await openIssues.CountAsync(cancellationToken),
            openBySeverity
        );

        var completion = total == 0 ? 0 : (int)Math.Round(done * 100d / total);

        return new DashboardResponse(
            userId,
            new TaskSummary(total, done, total - done, completion),
            issueSummary,
            await feedback.CountAsync(cancellationToken),
            await notes.CountAsync(cancellationToken),
            recentTasks,
            await RecentActivityAsync(userId, cancellationToken)
        );
    }

    /// <summary>Newest entries of every kind, merged into one feed ordered by last update.</summary>
    private async Task<List<ActivityItem>> RecentActivityAsync(
        int userId,
        CancellationToken cancellationToken
    )
    {
        var tasks = await db
            .Tasks.AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Id)
            .Take(RecentActivityCount)
            .Select(t => new ActivityItem(
                "Task",
                t.Id,
                t.EntryDate,
                t.Title,
                t.Status.ToString(),
                t.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        var issues = await db
            .Issues.AsNoTracking()
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.Id)
            .Take(RecentActivityCount)
            .Select(i => new
            {
                i.Id,
                i.EntryDate,
                i.Title,
                i.Severity,
                i.Status,
                i.UpdatedAt,
            })
            .ToListAsync(cancellationToken);

        var feedback = await db
            .Feedback.AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.Id)
            .Take(RecentActivityCount)
            .Select(f => new ActivityItem(
                "Feedback",
                f.Id,
                f.EntryDate,
                f.Title,
                f.Type.ToString(),
                f.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        var notes = await db
            .Notes.AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.Id)
            .Take(RecentActivityCount)
            .Select(n => new ActivityItem("Note", n.Id, n.EntryDate, n.Title, "Note", n.UpdatedAt))
            .ToListAsync(cancellationToken);

        return
        [
            .. tasks
                .Concat(
                    issues.Select(i => new ActivityItem(
                        "Issue",
                        i.Id,
                        i.EntryDate,
                        i.Title,
                        $"{i.Severity} · {i.Status}",
                        i.UpdatedAt
                    ))
                )
                .Concat(feedback)
                .Concat(notes)
                .OrderByDescending(item => item.UpdatedAt)
                .ThenByDescending(item => item.Id)
                .Take(RecentActivityCount),
        ];
    }
}
