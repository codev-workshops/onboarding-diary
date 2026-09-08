using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Diary;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Team;

/// <summary>
/// Read-only roster of recruits: managers see the recruits assigned to them, admins see everyone.
/// </summary>
public class TeamService(AppDbContext db)
{
    public async Task<PagedResponse<TeamMemberResponse>> ListAsync(
        Caller caller,
        TeamListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var recruits = db
            .Users.AsNoTracking()
            .Include(u => u.Department)
            .Include(u => u.Manager)
            .Where(u => u.Role == UserRole.Recruit);

        recruits =
            caller.Role == UserRole.Manager
                ? recruits.Where(u => u.ManagerId == caller.UserId)
                : query.ManagerId is { } managerId
                    ? recruits.Where(u => u.ManagerId == managerId)
                    : recruits;

        if (query.UserId is { } userId)
        {
            recruits = recruits.Where(u => u.Id == userId);
        }

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            recruits = recruits.Where(u =>
                EF.Functions.Like(u.FullName, $"%{term}%") || EF.Functions.Like(u.Email, $"%{term}%")
            );
        }

        recruits = query.Sort switch
        {
            "-name" => recruits.OrderByDescending(u => u.FullName).ThenBy(u => u.Id),
            _ => recruits.OrderBy(u => u.FullName).ThenBy(u => u.Id),
        };

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TaskEntryRules.MaxPageSize);
        var total = await recruits.CountAsync(cancellationToken);
        var users = await recruits.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        var ids = users.Select(u => u.Id).ToList();

        var taskCounts = await db
            .Tasks.AsNoTracking()
            .Where(t => ids.Contains(t.UserId))
            .GroupBy(t => t.UserId)
            .Select(group => new
            {
                UserId = group.Key,
                Total = group.Count(),
                Done = group.Count(t => t.Status == TaskEntryStatus.Done),
            })
            .ToDictionaryAsync(row => row.UserId, cancellationToken);

        var openIssueCounts = await db
            .Issues.AsNoTracking()
            .Where(i =>
                ids.Contains(i.UserId)
                && (i.Status == IssueStatus.Open || i.Status == IssueStatus.InProgress)
            )
            .GroupBy(i => i.UserId)
            .Select(group => new { UserId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.UserId, row => row.Count, cancellationToken);

        var lastActivity = await LastActivityAsync(ids, cancellationToken);

        var items = users
            .Select(user =>
            {
                taskCounts.TryGetValue(user.Id, out var tasks);
                var totalTasks = tasks?.Total ?? 0;
                var doneTasks = tasks?.Done ?? 0;

                return new TeamMemberResponse(
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Department?.Name,
                    user.StartDate,
                    user.ManagerId,
                    user.Manager?.FullName,
                    user.IsActive,
                    totalTasks,
                    totalTasks == 0 ? 0 : (int)Math.Round(doneTasks * 100d / totalTasks),
                    openIssueCounts.GetValueOrDefault(user.Id),
                    lastActivity.GetValueOrDefault(user.Id)
                );
            })
            .ToList();

        return new PagedResponse<TeamMemberResponse>(items, page, pageSize, total);
    }

    /// <summary>Roster entry for one recruit, or null when the caller may not see them.</summary>
    public async Task<TeamMemberResponse?> GetAsync(
        Caller caller,
        int userId,
        CancellationToken cancellationToken = default
    )
    {
        var page = await ListAsync(
            caller,
            new TeamListQuery(null, null, userId, 1, 1),
            cancellationToken
        );

        return page.Items.FirstOrDefault();
    }

    /// <summary>
    /// Newest update across all four entry kinds per recruit. SQLite cannot order or aggregate
    /// <see cref="DateTimeOffset" /> in SQL, so the maximum is taken in memory.
    /// </summary>
    private async Task<Dictionary<int, DateTimeOffset>> LastActivityAsync(
        IReadOnlyList<int> ids,
        CancellationToken cancellationToken
    )
    {
        var updates = await db
            .Tasks.AsNoTracking()
            .Where(t => ids.Contains(t.UserId))
            .Select(t => new { t.UserId, t.UpdatedAt })
            .Concat(
                db.Issues.AsNoTracking()
                    .Where(i => ids.Contains(i.UserId))
                    .Select(i => new { i.UserId, i.UpdatedAt })
            )
            .Concat(
                db.Feedback.AsNoTracking()
                    .Where(f => ids.Contains(f.UserId))
                    .Select(f => new { f.UserId, f.UpdatedAt })
            )
            .Concat(
                db.Notes.AsNoTracking()
                    .Where(n => ids.Contains(n.UserId))
                    .Select(n => new { n.UserId, n.UpdatedAt })
            )
            .ToListAsync(cancellationToken);

        return updates
            .GroupBy(row => row.UserId)
            .ToDictionary(group => group.Key, group => group.Max(row => row.UpdatedAt));
    }
}
