using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Models;

namespace OnboardingDiary.Api.Services;

public class DashboardService : IDashboardService
{
    private const int RecentActivityLimit = 10;
    private const int ChecklistItemLimit = 25;
    private const int ActivityWeekCount = 8;

    private readonly AppDbContext _db;
    private readonly IAccessService _access;
    private readonly ICurrentUser _currentUser;

    public DashboardService(AppDbContext db, IAccessService access, ICurrentUser currentUser)
    {
        _db = db;
        _access = access;
        _currentUser = currentUser;
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
            RecentActivity = recentActivity,
            StartDate = user.StartDate,
            Journey = BuildJourney(user.StartDate, tasks),
            Checklist = BuildChecklist(tasks)
        };
    }

    public async Task<ManagerDashboardDto> GetManagerDashboardAsync(CancellationToken cancellationToken = default)
    {
        var recruits = await OverseenRecruitsAsync(cancellationToken);
        var recruitIds = recruits.Select(r => r.Id).ToList();

        var tasks = await _db.Tasks.AsNoTracking()
            .Where(t => recruitIds.Contains(t.UserId))
            .Select(t => new { t.UserId, t.Status })
            .ToListAsync(cancellationToken);
        var issues = await _db.Issues.AsNoTracking()
            .Where(i => recruitIds.Contains(i.UserId))
            .Select(i => new { i.UserId, i.Status, i.Severity })
            .ToListAsync(cancellationToken);
        var feedback = await _db.Feedback.AsNoTracking()
            .Where(f => recruitIds.Contains(f.UserId))
            .Select(f => f.Type)
            .ToListAsync(cancellationToken);
        var notesCount = await _db.Notes.AsNoTracking()
            .CountAsync(n => recruitIds.Contains(n.UserId), cancellationToken);

        var openIssues = issues
            .Where(i => i.Status is IssueStatus.Open or IssueStatus.InProgress)
            .ToList();

        var progress = recruits
            .Select(recruit =>
            {
                var recruitTasks = tasks.Where(t => t.UserId == recruit.Id).ToList();
                var completed = recruitTasks.Count(t => t.Status == TaskEntryStatus.Completed);
                return new RecruitProgressDto
                {
                    RecruitId = recruit.Id,
                    RecruitName = recruit.FullName,
                    Department = recruit.Department,
                    StartDate = recruit.StartDate,
                    TaskTotal = recruitTasks.Count,
                    TaskCompleted = completed,
                    TaskCompletionPercent = Percent(completed, recruitTasks.Count),
                    OpenIssues = openIssues.Count(i => i.UserId == recruit.Id)
                };
            })
            .ToList();

        return new ManagerDashboardDto
        {
            RecruitCount = recruits.Count,
            Recruits = progress,
            OpenIssuesBySeverity = new IssueSeverityCountsDto
            {
                Low = openIssues.Count(i => i.Severity == IssueSeverity.Low),
                Medium = openIssues.Count(i => i.Severity == IssueSeverity.Medium),
                High = openIssues.Count(i => i.Severity == IssueSeverity.High),
                Critical = openIssues.Count(i => i.Severity == IssueSeverity.Critical)
            },
            FeedbackCounts = new FeedbackCountsDto
            {
                Total = feedback.Count,
                Positive = feedback.Count(type => type == FeedbackType.Positive),
                Suggestion = feedback.Count(type => type == FeedbackType.Suggestion),
                Concern = feedback.Count(type => type == FeedbackType.Concern)
            },
            Totals = new ManagerTotalsDto
            {
                Tasks = tasks.Count,
                CompletedTasks = tasks.Count(t => t.Status == TaskEntryStatus.Completed),
                OpenIssues = openIssues.Count,
                Notes = notesCount
            }
        };
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken cancellationToken = default)
    {
        var users = await _db.Users.AsNoTracking()
            .Select(u => new { u.Role, u.Department })
            .ToListAsync(cancellationToken);

        var weekStarts = Enumerable
            .Range(0, ActivityWeekCount)
            .Select(offset => WeekStart(DateTime.UtcNow.ToUtcDate()).AddDays(-7 * offset))
            .OrderBy(date => date)
            .ToList();

        var taskDates = await _db.Tasks.AsNoTracking().Select(t => t.Date).ToListAsync(cancellationToken);
        var issueDates = await _db.Issues.AsNoTracking().Select(i => i.Date).ToListAsync(cancellationToken);
        var feedbackDates = await _db.Feedback.AsNoTracking().Select(f => f.Date).ToListAsync(cancellationToken);
        var noteDates = await _db.Notes.AsNoTracking().Select(n => n.Date).ToListAsync(cancellationToken);

        var activity = weekStarts
            .Select(weekStart => new WeeklyActivityDto
            {
                WeekStartDate = weekStart,
                Tasks = CountInWeek(taskDates, weekStart),
                Issues = CountInWeek(issueDates, weekStart),
                Feedback = CountInWeek(feedbackDates, weekStart),
                Notes = CountInWeek(noteDates, weekStart)
            })
            .ToList();

        return new AdminDashboardDto
        {
            UserCount = users.Count,
            UsersByRole = Enum.GetValues<UserRole>()
                .Select(role => new LabelCountDto
                {
                    Label = role.ToString(),
                    Count = users.Count(u => u.Role == role)
                })
                .ToList(),
            UsersByDepartment = users
                .GroupBy(u => string.IsNullOrWhiteSpace(u.Department) ? "Unassigned" : u.Department!)
                .OrderByDescending(group => group.Count())
                .ThenBy(group => group.Key, StringComparer.Ordinal)
                .Select(group => new LabelCountDto { Label = group.Key, Count = group.Count() })
                .ToList(),
            ActivityByWeek = activity,
            Totals = new EntryTotalsDto
            {
                Tasks = taskDates.Count,
                Issues = issueDates.Count,
                Feedback = feedbackDates.Count,
                Notes = noteDates.Count
            }
        };

        static int CountInWeek(IEnumerable<DateTime> dates, DateTime weekStart) =>
            dates.Count(date => date.Date >= weekStart && date.Date < weekStart.AddDays(7));
    }

    private static JourneyDto BuildJourney(DateTime startDate, IReadOnlyCollection<TaskEntry> tasks)
    {
        var stages = tasks
            .GroupBy(t => t.Category)
            .Select(group =>
            {
                var completed = group.Count(t => t.Status == TaskEntryStatus.Completed);
                var blocked = group.Count(t => t.Status == TaskEntryStatus.Blocked);
                var inProgress = group.Count(t => t.Status == TaskEntryStatus.InProgress);
                var firstDate = group.Min(t => t.Date);

                return new JourneyStageDto
                {
                    Key = group.Key.ToString(),
                    Label = Humanize(group.Key.ToString()),
                    Total = group.Count(),
                    NotStarted = group.Count(t => t.Status == TaskEntryStatus.NotStarted),
                    InProgress = inProgress,
                    Blocked = blocked,
                    Completed = completed,
                    CompletionPercent = Percent(completed, group.Count()),
                    Status = StageStatus(completed, inProgress, blocked, group.Count()),
                    FirstActivityDate = firstDate,
                    LastActivityDate = group.Max(t => t.Date),
                    DayOffset = Math.Max(0, (int)(firstDate.Date - startDate.Date).TotalDays)
                };
            })
            .OrderBy(stage => stage.DayOffset)
            .ThenBy(stage => stage.Key, StringComparer.Ordinal)
            .ToList();

        return new JourneyDto
        {
            StartDate = startDate,
            DaysSinceStart = Math.Max(0, (int)(DateTime.UtcNow.Date - startDate.Date).TotalDays),
            Stages = stages
        };
    }

    private static ChecklistDto BuildChecklist(IReadOnlyCollection<TaskEntry> tasks)
    {
        var completed = tasks.Count(t => t.Status == TaskEntryStatus.Completed);
        var inProgress = tasks.Count(t => t.Status is TaskEntryStatus.InProgress or TaskEntryStatus.Blocked);

        var items = tasks
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.Id)
            .Take(ChecklistItemLimit)
            .Select(t => new ChecklistItemDto
            {
                Id = t.Id,
                Title = t.Title,
                Category = t.Category.ToString(),
                Date = t.Date,
                State = ChecklistState(t.Status),
                IsBlocked = t.Status == TaskEntryStatus.Blocked
            })
            .ToList();

        return new ChecklistDto
        {
            Total = tasks.Count,
            Completed = completed,
            InProgress = inProgress,
            Pending = tasks.Count(t => t.Status == TaskEntryStatus.NotStarted),
            ProgressPercent = Percent(completed, tasks.Count),
            Items = items
        };
    }

    private async Task<IReadOnlyList<User>> OverseenRecruitsAsync(CancellationToken cancellationToken)
    {
        var query = _db.Users.AsNoTracking();
        query = _currentUser.Role == UserRole.Admin
            ? query.Where(u => u.Role == UserRole.NewRecruit)
            : query.Where(u => u.ManagerId == _currentUser.Id);

        return await query.OrderBy(u => u.FullName).ToListAsync(cancellationToken);
    }

    private static string ChecklistState(TaskEntryStatus status) => status switch
    {
        TaskEntryStatus.Completed => "Completed",
        TaskEntryStatus.InProgress or TaskEntryStatus.Blocked => "InProgress",
        _ => "Pending"
    };

    private static string StageStatus(int completed, int inProgress, int blocked, int total)
    {
        if (total > 0 && completed == total)
        {
            return "Completed";
        }

        if (blocked > 0)
        {
            return "Blocked";
        }

        return inProgress > 0 || completed > 0 ? "InProgress" : "NotStarted";
    }

    private static int Percent(int part, int total) =>
        total == 0 ? 0 : (int)Math.Round(part * 100.0 / total);

    /// <summary>Monday of the week the date falls in.</summary>
    private static DateTime WeekStart(DateTime date) =>
        date.AddDays(-(((int)date.DayOfWeek + 6) % 7)).ToUtcDate();

    /// <summary>Turns a PascalCase enum name into a readable label, e.g. "NotStarted" -> "Not Started".</summary>
    private static string Humanize(string value) => Regex.Replace(value, "([a-z])([A-Z])", "$1 $2");
}
