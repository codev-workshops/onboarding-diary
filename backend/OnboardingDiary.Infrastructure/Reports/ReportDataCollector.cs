using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Application.Reports;
using OnboardingDiary.Infrastructure.Persistence;

namespace OnboardingDiary.Infrastructure.Reports;

public class ReportDataCollector : IReportDataCollector
{
    private readonly AppDbContext _context;

    public ReportDataCollector(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReportData> CollectAsync(
        Guid subjectUserId,
        Guid generatedByUserId,
        DateTime startDate,
        DateTime endDate,
        List<string> categories,
        CancellationToken ct = default)
    {
        var effectiveCategories = categories
            .Any(c => c.Equals("all", StringComparison.OrdinalIgnoreCase))
            ? new List<string> { "tasks", "issues", "feedback", "notes" }
            : categories.Select(c => c.ToLowerInvariant()).Distinct().ToList();

        var subject = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == subjectUserId, ct)
            ?? throw new KeyNotFoundException($"Recruit with ID {subjectUserId} not found.");

        var generatedBy = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == generatedByUserId, ct);

        var data = new ReportData
        {
            RecruitName = subject.Name,
            Department = subject.Department,
            RecruitStartDate = subject.StartDate,
            ReportStartDate = startDate,
            ReportEndDate = endDate,
            GeneratedByName = generatedBy?.Name ?? "Unknown",
            GeneratedOn = DateTime.UtcNow,
            Categories = effectiveCategories
        };

        if (effectiveCategories.Contains("tasks"))
        {
            data.Tasks.AddRange(await _context.Tasks.AsNoTracking()
                .Where(t => t.UserId == subjectUserId && t.Date >= startDate && t.Date <= endDate)
                .OrderBy(t => t.Date)
                .ToListAsync(ct));
        }

        if (effectiveCategories.Contains("issues"))
        {
            data.Issues.AddRange(await _context.Issues.AsNoTracking()
                .Where(i => i.UserId == subjectUserId && i.Date >= startDate && i.Date <= endDate)
                .OrderBy(i => i.Date)
                .ToListAsync(ct));
        }

        if (effectiveCategories.Contains("feedback"))
        {
            data.Feedbacks.AddRange(await _context.Feedbacks.AsNoTracking()
                .Where(f => f.UserId == subjectUserId && f.Date >= startDate && f.Date <= endDate)
                .OrderBy(f => f.Date)
                .ToListAsync(ct));
        }

        if (effectiveCategories.Contains("notes"))
        {
            data.Notes.AddRange(await _context.Notes.AsNoTracking()
                .Where(n => n.UserId == subjectUserId && n.Date >= startDate && n.Date <= endDate)
                .OrderBy(n => n.Date)
                .ToListAsync(ct));
        }

        return data;
    }
}
