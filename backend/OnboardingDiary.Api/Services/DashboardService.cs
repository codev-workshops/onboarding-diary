using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class DashboardService : IDashboardService
{
    private const int RecentActivityLimit = 10;

    private readonly AppDbContext _db;
    private readonly IAccessService _access;

    public DashboardService(AppDbContext db, IAccessService access)
    {
        _db = db;
        _access = access;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(
        int? recruitId,
        CancellationToken cancellationToken = default)
    {
        var userId = await _access.ResolveReadableUserIdAsync(recruitId, cancellationToken);
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw AppException.NotFound("User not found.");

        var tasks = await _db.Tasks.AsNoTracking().Where(t => t.UserId == userId).ToListAsync(cancellationToken);
        var issues = await _db.Issues.AsNoTracking().Where(i => i.UserId == userId).ToListAsync(cancellationToken);
        var feedback = await _db.Feedback.AsNoTracking().Where(f => f.UserId == userId).ToListAsync(cancellationToken);
        var notes = await _db.Notes.AsNoTracking().Where(n => n.UserId == userId).ToListAsync(cancellationToken);

        var completed = tasks.Count(t => t.Status == TaskEntryStatus.Completed);

        var recentActivity = tasks
            .Select(t => new ActivityItemDto
            {
                Type = "Task", Id = t.Id, Title = t.Title, Date = t.Date, Status = t.Status.ToString()
            })
            .Concat(issues.Select(i => new ActivityItemDto
            {
                Type = "Issue", Id = i.Id, Title = i.Title, Date = i.Date, Status = i.Status.ToString()
            }))
            .Concat(feedback.Select(f => new ActivityItemDto
            {
                Type = "Feedback", Id = f.Id, Title = f.Subject, Date = f.Date, Status = f.Type.ToString()
            }))
            .Concat(notes.Select(n => new ActivityItemDto
            {
                Type = "Note", Id = n.Id, Title = n.Title, Date = n.Date, Status = null
            }))
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.Id)
            .Take(RecentActivityLimit)
            .ToList();

        return new DashboardSummaryDto
        {
            RecruitId = user.Id,
            RecruitName = user.FullName,
            TaskCounts = new TaskCountsDto
            {
                Total = tasks.Count,
                NotStarted = tasks.Count(t => t.Status == TaskEntryStatus.NotStarted),
                InProgress = tasks.Count(t => t.Status == TaskEntryStatus.InProgress),
                Blocked = tasks.Count(t => t.Status == TaskEntryStatus.Blocked),
                Completed = completed
            },
            TaskCompletionPercent = tasks.Count == 0 ? 0 : (int)Math.Round(completed * 100.0 / tasks.Count),
            IssueCounts = new IssueCountsDto
            {
                Total = issues.Count,
                Open = issues.Count(i => i.Status == IssueStatus.Open),
                InProgress = issues.Count(i => i.Status == IssueStatus.InProgress),
                Resolved = issues.Count(i => i.Status == IssueStatus.Resolved),
                Closed = issues.Count(i => i.Status == IssueStatus.Closed)
            },
            FeedbackCounts = new FeedbackCountsDto
            {
                Total = feedback.Count,
                Positive = feedback.Count(f => f.Type == FeedbackType.Positive),
                Suggestion = feedback.Count(f => f.Type == FeedbackType.Suggestion),
                Concern = feedback.Count(f => f.Type == FeedbackType.Concern)
            },
            NotesCount = notes.Count,
            RecentActivity = recentActivity
        };
    }
}
