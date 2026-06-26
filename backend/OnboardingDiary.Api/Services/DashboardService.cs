using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.DTOs.Dashboard;
using OnboardingDiary.Api.Entities.Enums;

namespace OnboardingDiary.Api.Services;

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetRecruitDashboardAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found.");

        var totalTasks = await _context.TaskEntries.CountAsync(t => t.UserId == userId);
        var completedTasks = await _context.TaskEntries.CountAsync(t => t.UserId == userId && t.Status == TaskEntryStatus.Completed);
        var openIssues = await _context.IssueEntries.CountAsync(i => i.UserId == userId && (i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress));
        var totalIssues = await _context.IssueEntries.CountAsync(i => i.UserId == userId);
        var totalFeedback = await _context.FeedbackEntries.CountAsync(f => f.UserId == userId);
        var totalNotes = await _context.NoteEntries.CountAsync(n => n.UserId == userId);

        var recentTasks = await _context.TaskEntries
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Date)
            .Take(5)
            .Select(t => new RecentEntryDto
            {
                Type = "Task",
                Id = t.Id,
                Title = t.Title,
                Date = t.Date,
                Status = t.Status.ToString()
            })
            .ToListAsync();

        var recentIssues = await _context.IssueEntries
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.Date)
            .Take(5)
            .Select(i => new RecentEntryDto
            {
                Type = "Issue",
                Id = i.Id,
                Title = i.Title,
                Date = i.Date,
                Status = i.Status.ToString()
            })
            .ToListAsync();

        var recentFeedback = await _context.FeedbackEntries
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.Date)
            .Take(5)
            .Select(f => new RecentEntryDto
            {
                Type = "Feedback",
                Id = f.Id,
                Title = f.Subject,
                Date = f.Date,
                Status = f.Type.ToString()
            })
            .ToListAsync();

        var recentNotes = await _context.NoteEntries
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.Date)
            .Take(5)
            .Select(n => new RecentEntryDto
            {
                Type = "Note",
                Id = n.Id,
                Title = n.Title,
                Date = n.Date,
                Status = null
            })
            .ToListAsync();

        var recentEntries = recentTasks
            .Concat(recentIssues)
            .Concat(recentFeedback)
            .Concat(recentNotes)
            .OrderByDescending(e => e.Date)
            .Take(5)
            .ToList();

        var daysElapsed = (DateTime.UtcNow.Date - user.StartDate.Date).Days;

        return new DashboardSummaryDto
        {
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            TaskCompletionPercentage = totalTasks > 0 ? Math.Round((double)completedTasks / totalTasks * 100, 1) : 0,
            OpenIssues = openIssues,
            TotalIssues = totalIssues,
            TotalFeedback = totalFeedback,
            TotalNotes = totalNotes,
            RecentEntries = recentEntries,
            OnboardingDaysElapsed = Math.Max(daysElapsed, 0),
            StartDate = user.StartDate
        };
    }

    public async Task<List<RecruitOverviewDto>> GetManagerDashboardAsync(int managerId)
    {
        var recruits = await _context.Users
            .Where(u => u.ManagerId == managerId && u.Role == UserRole.Recruit)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Department,
                u.StartDate
            })
            .ToListAsync();

        var recruitIds = recruits.Select(r => r.Id).ToList();

        var taskStats = await _context.TaskEntries
            .Where(t => recruitIds.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                TotalTasks = g.Count(),
                CompletedTasks = g.Count(t => t.Status == TaskEntryStatus.Completed)
            })
            .ToListAsync();

        var issueStats = await _context.IssueEntries
            .Where(i => recruitIds.Contains(i.UserId))
            .GroupBy(i => i.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                OpenIssues = g.Count(i => i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress)
            })
            .ToListAsync();

        var feedbackStats = await _context.FeedbackEntries
            .Where(f => recruitIds.Contains(f.UserId))
            .GroupBy(f => f.UserId)
            .Select(g => new
            {
                UserId = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        return recruits.Select(r =>
        {
            var tasks = taskStats.FirstOrDefault(t => t.UserId == r.Id);
            var issues = issueStats.FirstOrDefault(i => i.UserId == r.Id);
            var feedback = feedbackStats.FirstOrDefault(f => f.UserId == r.Id);

            return new RecruitOverviewDto
            {
                Id = r.Id,
                Name = r.Name,
                Department = r.Department,
                StartDate = r.StartDate,
                DaysElapsed = Math.Max((DateTime.UtcNow.Date - r.StartDate.Date).Days, 0),
                TasksCompleted = tasks?.CompletedTasks ?? 0,
                TotalTasks = tasks?.TotalTasks ?? 0,
                OpenIssues = issues?.OpenIssues ?? 0,
                FeedbackCount = feedback?.Count ?? 0
            };
        }).ToList();
    }

    public async Task<SystemOverviewDto> GetSystemDashboardAsync()
    {
        var userCounts = await _context.Users
            .GroupBy(u => u.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToListAsync();

        var entryCounts = new Dictionary<string, int>
        {
            ["Tasks"] = await _context.TaskEntries.CountAsync(),
            ["Issues"] = await _context.IssueEntries.CountAsync(),
            ["Feedback"] = await _context.FeedbackEntries.CountAsync(),
            ["Notes"] = await _context.NoteEntries.CountAsync()
        };

        var recentTaskActivity = await _context.TaskEntries
            .Include(t => t.User)
            .OrderByDescending(t => t.UpdatedAt)
            .Take(10)
            .Select(t => new RecentActivityDto
            {
                UserId = t.UserId,
                UserName = t.User.Name,
                Action = "Task",
                Title = t.Title,
                Timestamp = t.UpdatedAt
            })
            .ToListAsync();

        var recentIssueActivity = await _context.IssueEntries
            .Include(i => i.User)
            .OrderByDescending(i => i.UpdatedAt)
            .Take(10)
            .Select(i => new RecentActivityDto
            {
                UserId = i.UserId,
                UserName = i.User.Name,
                Action = "Issue",
                Title = i.Title,
                Timestamp = i.UpdatedAt
            })
            .ToListAsync();

        var recentFeedbackActivity = await _context.FeedbackEntries
            .Include(f => f.User)
            .OrderByDescending(f => f.UpdatedAt)
            .Take(10)
            .Select(f => new RecentActivityDto
            {
                UserId = f.UserId,
                UserName = f.User.Name,
                Action = "Feedback",
                Title = f.Subject,
                Timestamp = f.UpdatedAt
            })
            .ToListAsync();

        var recentNoteActivity = await _context.NoteEntries
            .Include(n => n.User)
            .OrderByDescending(n => n.UpdatedAt)
            .Take(10)
            .Select(n => new RecentActivityDto
            {
                UserId = n.UserId,
                UserName = n.User.Name,
                Action = "Note",
                Title = n.Title,
                Timestamp = n.UpdatedAt
            })
            .ToListAsync();

        var recentActivity = recentTaskActivity
            .Concat(recentIssueActivity)
            .Concat(recentFeedbackActivity)
            .Concat(recentNoteActivity)
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .ToList();

        return new SystemOverviewDto
        {
            UserCounts = userCounts.ToDictionary(u => u.Role.ToString(), u => u.Count),
            EntryCounts = entryCounts,
            RecentActivity = recentActivity
        };
    }
}
