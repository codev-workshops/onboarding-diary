using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Auth;
using OnboardingDiary.Application.Dashboard;
using OnboardingDiary.Application.Dashboard.Dtos;
using OnboardingDiary.Application.Tasks;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Dashboard;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ITaskService _taskService;

    public DashboardService(AppDbContext db, ICurrentUser currentUser, ITaskService taskService)
    {
        _db = db;
        _currentUser = currentUser;
        _taskService = taskService;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var userId = _currentUser.UserId!.Value;

        var taskStats = await _taskService.GetStatsAsync(null, ct);

        var issues = _db.Issues.Where(i => i.UserId == userId);
        var issueStats = new IssueStatsDto(
            Total: await issues.CountAsync(ct),
            Open: await issues.CountAsync(i => i.Status == IssueStatus.Open, ct),
            InProgress: await issues.CountAsync(i => i.Status == IssueStatus.InProgress, ct),
            Resolved: await issues.CountAsync(i => i.Status == IssueStatus.Resolved, ct),
            Closed: await issues.CountAsync(i => i.Status == IssueStatus.Closed, ct),
            Critical: await issues.CountAsync(i => i.Severity == IssueSeverity.Critical, ct),
            Escalated: await issues.CountAsync(i => i.IsEscalated, ct));

        var feedbacks = _db.Feedbacks.Where(f => f.UserId == userId);
        var feedbackStats = new FeedbackStatsDto(
            Total: await feedbacks.CountAsync(ct),
            Positive: await feedbacks.CountAsync(f => f.Type == FeedbackType.Positive, ct),
            Suggestion: await feedbacks.CountAsync(f => f.Type == FeedbackType.Suggestion, ct),
            Concern: await feedbacks.CountAsync(f => f.Type == FeedbackType.Concern, ct));

        var notes = _db.Notes.Where(n => n.UserId == userId);
        var noteStats = new NoteStatsDto(
            Total: await notes.CountAsync(ct),
            Pinned: await notes.CountAsync(n => n.IsPinned, ct));

        var recentTasks = await _db.Tasks
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Take(5)
            .Select(t => new RecentEntryDto(t.Id, t.Title, t.Date, t.Status.ToString()))
            .ToListAsync(ct);

        var recentIssues = await _db.Issues
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.Date)
            .ThenByDescending(i => i.CreatedAt)
            .Take(5)
            .Select(i => new RecentEntryDto(i.Id, i.Title, i.Date, i.Severity.ToString()))
            .ToListAsync(ct);

        var recentFeedback = await _db.Feedbacks
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.Date)
            .ThenByDescending(f => f.CreatedAt)
            .Take(5)
            .Select(f => new RecentEntryDto(f.Id, f.Subject, f.Date, f.Type.ToString()))
            .ToListAsync(ct);

        var recentNotes = await _db.Notes
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.Date)
            .ThenByDescending(n => n.CreatedAt)
            .Take(5)
            .Select(n => new RecentEntryDto(n.Id, n.Title, n.Date, n.IsPinned ? "Pinned" : null))
            .ToListAsync(ct);

        var recentEntries = new RecentEntriesDto(recentTasks, recentIssues, recentFeedback, recentNotes);

        var openIssues = await _db.Issues
            .Where(i => i.UserId == userId && (i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress))
            .OrderByDescending(i => i.Severity)
            .ThenByDescending(i => i.Date)
            .Select(i => new OpenIssueDto(i.Id, i.Title, i.Severity.ToString(), i.Date))
            .ToListAsync(ct);

        return new DashboardSummaryDto(taskStats, issueStats, feedbackStats, noteStats, recentEntries, openIssues);
    }

    public async Task<IReadOnlyList<TeamRecruitDto>> GetTeamAsync(string? department, CancellationToken ct = default)
    {
        var userId = _currentUser.UserId!.Value;
        var role = _currentUser.Role;

        IQueryable<Domain.Entities.User> recruitsQuery;

        if (role == nameof(Role.Admin))
        {
            recruitsQuery = _db.Users.Where(u => u.Role == Role.Recruit && u.IsActive);
            if (!string.IsNullOrWhiteSpace(department))
                recruitsQuery = recruitsQuery.Where(u => u.Department == department);
        }
        else
        {
            recruitsQuery = _db.Users.Where(u => u.ManagerId == userId && u.Role == Role.Recruit && u.IsActive);
        }

        var recruitIds = await recruitsQuery.Select(u => u.Id).ToListAsync(ct);

        var taskGroups = await _db.Tasks
            .Where(t => recruitIds.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Total = g.Count(),
                Completed = g.Count(t => t.Status == Domain.Enums.TaskStatus.Completed)
            })
            .ToListAsync(ct);

        var issueGroups = await _db.Issues
            .Where(i => recruitIds.Contains(i.UserId) && (i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress))
            .GroupBy(i => i.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                OpenCount = g.Count(),
                EscalatedCount = g.Count(i => i.IsEscalated)
            })
            .ToListAsync(ct);

        var recruits = await recruitsQuery
            .Select(u => new { u.Id, u.Name, u.Department, u.StartDate })
            .ToListAsync(ct);

        var today = DateTime.UtcNow.Date;

        var result = recruits.Select(r =>
        {
            var taskData = taskGroups.FirstOrDefault(t => t.UserId == r.Id);
            var issueData = issueGroups.FirstOrDefault(i => i.UserId == r.Id);
            var daysSinceStart = (int)(today - r.StartDate.Date).TotalDays;
            var completionPct = taskData is { Total: > 0 }
                ? Math.Round((double)taskData.Completed / taskData.Total * 100, 1)
                : 0.0;

            return new TeamRecruitDto(
                r.Id,
                r.Name,
                r.Department,
                r.StartDate,
                daysSinceStart,
                completionPct,
                issueData?.OpenCount ?? 0,
                issueData?.EscalatedCount ?? 0);
        }).ToList();

        return result;
    }
}
