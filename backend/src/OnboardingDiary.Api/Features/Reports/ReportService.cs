using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Reports;

/// <summary>
/// Builds the diary report for one recruit. Scope is decided by
/// <see cref="Diary.EntryScopeService"/> before this runs, so the service only ever sees a user id
/// the caller is allowed to read.
/// </summary>
public class ReportService(AppDbContext db, TimeProvider timeProvider)
{
    public async Task<ReportResponse?> BuildAsync(
        int userId,
        ReportQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var user = await db
            .Users.AsNoTracking()
            .Include(u => u.Department)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
        {
            return null;
        }

        var header = new ReportHeader(
            user.Id,
            user.FullName,
            user.Email,
            user.Department?.Name,
            user.StartDate,
            query.From,
            query.To,
            timeProvider.GetUtcNow()
        );

        var sections = query.Sections.Count == 0 ? ReportRules.AllSections : query.Sections;

        var from = query.From ?? DateOnly.MinValue;
        var to = query.To ?? DateOnly.MaxValue;

        var tasks = await db
            .Tasks.AsNoTracking()
            .Where(t => t.UserId == userId && t.EntryDate >= from && t.EntryDate <= to)
            .OrderBy(t => t.EntryDate)
            .ThenBy(t => t.Id)
            .Select(t => TaskResponse.From(t))
            .ToListAsync(cancellationToken);

        var issues = await db
            .Issues.AsNoTracking()
            .Where(i => i.UserId == userId && i.EntryDate >= from && i.EntryDate <= to)
            .OrderBy(i => i.EntryDate)
            .ThenBy(i => i.Id)
            .Select(i => IssueResponse.From(i))
            .ToListAsync(cancellationToken);

        var feedback = await db
            .Feedback.AsNoTracking()
            .Where(f => f.UserId == userId && f.EntryDate >= from && f.EntryDate <= to)
            .OrderBy(f => f.EntryDate)
            .ThenBy(f => f.Id)
            .Select(f => FeedbackResponse.From(f))
            .ToListAsync(cancellationToken);

        var notes = await db
            .Notes.AsNoTracking()
            .Include(n => n.Tags)
            .Where(n => n.UserId == userId && n.EntryDate >= from && n.EntryDate <= to)
            .OrderBy(n => n.EntryDate)
            .ThenBy(n => n.Id)
            .ToListAsync(cancellationToken);

        var summary = new ReportSummary(
            tasks.Count,
            tasks.Count(t => t.Status == TaskEntryStatus.Done),
            issues.Count(i => i.Status is IssueStatus.Open or IssueStatus.InProgress),
            issues.Count(i => i.Status is IssueStatus.Resolved or IssueStatus.Closed),
            feedback.Count,
            notes.Count
        );

        return new ReportResponse(
            header,
            summary,
            sections,
            sections.Contains(ReportSection.Tasks) ? tasks : [],
            sections.Contains(ReportSection.Issues) ? issues : [],
            sections.Contains(ReportSection.Feedback) ? feedback : [],
            sections.Contains(ReportSection.Notes)
                ? notes.Select(NoteResponse.From).ToList()
                : []
        );
    }
}
