using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Dashboard;

public class TrendsService(AppDbContext db, TimeProvider timeProvider)
{
    public async Task<TrendsResponse> GetAsync(
        int userId,
        TrendsQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var to = query.To ?? today;
        var from = query.From ?? to.AddDays(-(TrendsQueryValidator.DefaultRangeDays - 1));

        var buckets = new Dictionary<DateOnly, Counts>();
        for (var date = from; date <= to; date = date.AddDays(1))
        {
            buckets[date] = new Counts();
        }

        // Rows are bucketed in memory: SQLite cannot compare or group DateTimeOffset columns, so
        // the lifecycle timestamps are narrowed to "has one" in SQL and dated here.
        var tasks = await db
            .Tasks.AsNoTracking()
            .Where(t => t.UserId == userId)
            .Where(t => (t.EntryDate >= from && t.EntryDate <= to) || t.CompletedAt != null)
            .Select(t => new { t.EntryDate, t.CompletedAt })
            .ToListAsync(cancellationToken);

        foreach (var task in tasks)
        {
            if (buckets.TryGetValue(task.EntryDate, out var logged))
            {
                logged.TasksLogged++;
            }

            if (
                task.CompletedAt is { } completedAt
                && buckets.TryGetValue(UtcDate(completedAt), out var completed)
            )
            {
                completed.TasksCompleted++;
            }
        }

        var issues = await db
            .Issues.AsNoTracking()
            .Where(i => i.UserId == userId)
            .Where(i => (i.EntryDate >= from && i.EntryDate <= to) || i.ResolvedAt != null)
            .Select(i => new { i.EntryDate, i.ResolvedAt })
            .ToListAsync(cancellationToken);

        foreach (var issue in issues)
        {
            if (buckets.TryGetValue(issue.EntryDate, out var opened))
            {
                opened.IssuesOpened++;
            }

            if (
                issue.ResolvedAt is { } resolvedAt
                && buckets.TryGetValue(UtcDate(resolvedAt), out var resolved)
            )
            {
                resolved.IssuesResolved++;
            }
        }

        var feedbackDates = await db
            .Feedback.AsNoTracking()
            .Where(f => f.UserId == userId && f.EntryDate >= from && f.EntryDate <= to)
            .Select(f => f.EntryDate)
            .ToListAsync(cancellationToken);

        foreach (var date in feedbackDates)
        {
            buckets[date].FeedbackCount++;
        }

        var noteDates = await db
            .Notes.AsNoTracking()
            .Where(n => n.UserId == userId && n.EntryDate >= from && n.EntryDate <= to)
            .Select(n => n.EntryDate)
            .ToListAsync(cancellationToken);

        foreach (var date in noteDates)
        {
            buckets[date].NoteCount++;
        }

        var days = buckets
            .OrderBy(bucket => bucket.Key)
            .Select(bucket => new TrendDay(
                bucket.Key,
                bucket.Value.TasksLogged,
                bucket.Value.TasksCompleted,
                bucket.Value.IssuesOpened,
                bucket.Value.IssuesResolved,
                bucket.Value.FeedbackCount,
                bucket.Value.NoteCount
            ))
            .ToList();

        return new TrendsResponse(userId, from, to, days);
    }

    private static DateOnly UtcDate(DateTimeOffset moment) =>
        DateOnly.FromDateTime(moment.UtcDateTime);

    private class Counts
    {
        public int TasksLogged;
        public int TasksCompleted;
        public int IssuesOpened;
        public int IssuesResolved;
        public int FeedbackCount;
        public int NoteCount;
    }
}
