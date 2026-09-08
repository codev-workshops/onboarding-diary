using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;
using OnboardingDiary.Api.Infrastructure;

namespace OnboardingDiary.Api.Features.Dashboard;

public class DashboardService(AppDbContext db)
{
    public const int RecentTaskCount = 5;

    public async Task<DashboardResponse> GetAsync(
        int userId,
        CancellationToken cancellationToken = default
    )
    {
        var tasks = db.Tasks.AsNoTracking().Where(t => t.UserId == userId);

        var total = await tasks.CountAsync(cancellationToken);
        var done = await tasks.CountAsync(t => t.Status == TaskEntryStatus.Done, cancellationToken);

        var recent = await tasks
            .OrderByDescending(t => t.EntryDate)
            .ThenByDescending(t => t.Id)
            .Take(RecentTaskCount)
            .Select(t => TaskResponse.From(t))
            .ToListAsync(cancellationToken);

        var completion = total == 0 ? 0 : (int)Math.Round(done * 100d / total);

        return new DashboardResponse(
            userId,
            new TaskSummary(total, done, total - done, completion),
            recent
        );
    }
}
