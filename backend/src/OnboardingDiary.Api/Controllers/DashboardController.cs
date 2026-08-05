using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;
using TaskStatus = OnboardingDiary.Api.Domain.TaskStatus;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController(AppDbContext db, EntryAccess access) : ControllerBase
{
    /// Aggregated counts and recent activity for one recruit.
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummary>> Summary([FromQuery] Guid? userId)
    {
        var ownerId = await access.ResolveReadableOwnerAsync(User, userId);
        if (ownerId is null) return Forbid();

        var tasks = await db.Tasks.AsNoTracking().Where(t => t.UserId == ownerId).ToListAsync();
        var issues = await db.Issues.AsNoTracking().Where(i => i.UserId == ownerId).ToListAsync();
        var feedbackCount = await db.Feedback.CountAsync(f => f.UserId == ownerId);
        var noteCount = await db.Notes.CountAsync(n => n.UserId == ownerId);

        var recent = tasks
            .Select(t => new RecentActivity("Task", t.Id, t.Title, t.Date, t.Status.ToString()))
            .Concat(issues.Select(i => new RecentActivity("Issue", i.Id, i.Title, i.Date, i.Status.ToString())))
            .OrderByDescending(a => a.Date)
            .Take(5)
            .ToList();

        var completed = tasks.Count(t => t.Status == TaskStatus.Completed);

        return Ok(new DashboardSummary(
            TotalTasks: tasks.Count,
            CompletedTasks: completed,
            InProgressTasks: tasks.Count(t => t.Status == TaskStatus.InProgress),
            BlockedTasks: tasks.Count(t => t.Status == TaskStatus.Blocked),
            CompletionRate: tasks.Count == 0 ? 0 : Math.Round(100.0 * completed / tasks.Count, 1),
            OpenIssues: issues.Count(i => i.Status is IssueStatus.Open or IssueStatus.InProgress),
            TotalIssues: issues.Count,
            FeedbackCount: feedbackCount,
            NoteCount: noteCount,
            TasksByStatus: Enum.GetValues<TaskStatus>()
                .ToDictionary(status => status.ToString(), status => tasks.Count(t => t.Status == status)),
            TasksByCategory: Enum.GetValues<TaskCategory>()
                .ToDictionary(category => category.ToString(), category => tasks.Count(t => t.Category == category)),
            IssuesBySeverity: Enum.GetValues<IssueSeverity>()
                .ToDictionary(severity => severity.ToString(), severity => issues.Count(i => i.Severity == severity)),
            RecentActivity: recent));
    }
}
