using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Reports;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController(AppDbContext db, EntryAccess access) : ControllerBase
{
    [HttpGet("diary.csv")]
    public async Task<IActionResult> Csv([FromQuery] Guid? userId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var data = await LoadAsync(userId, from, to);
        if (data is null) return Forbid();

        return File(ReportBuilder.ToCsv(data), "text/csv", FileName(data, "csv"));
    }

    [HttpGet("diary.pdf")]
    public async Task<IActionResult> Pdf([FromQuery] Guid? userId, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var data = await LoadAsync(userId, from, to);
        if (data is null) return Forbid();

        return File(ReportBuilder.ToPdf(data), "application/pdf", FileName(data, "pdf"));
    }

    private static string FileName(ReportData data, string extension) =>
        $"onboarding-diary-{data.Recruit.FullName.Replace(' ', '-').ToLowerInvariant()}.{extension}";

    private async Task<ReportData?> LoadAsync(Guid? userId, DateOnly? from, DateOnly? to)
    {
        var ownerId = await access.ResolveReadableOwnerAsync(User, userId);
        if (ownerId is null) return null;

        var recruit = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == ownerId);
        if (recruit is null) return null;

        return new ReportData(
            recruit,
            from,
            to,
            await db.Tasks.AsNoTracking().Where(t => t.UserId == ownerId).Where(InRange<Domain.TaskEntry>(from, to)).OrderBy(t => t.Date).ToListAsync(),
            await db.Issues.AsNoTracking().Where(i => i.UserId == ownerId).Where(InRange<Domain.IssueEntry>(from, to)).OrderBy(i => i.Date).ToListAsync(),
            await db.Feedback.AsNoTracking().Where(f => f.UserId == ownerId).Where(InRange<Domain.FeedbackNote>(from, to)).OrderBy(f => f.Date).ToListAsync(),
            await db.Notes.AsNoTracking().Where(n => n.UserId == ownerId).Where(InRange<Domain.Note>(from, to)).OrderBy(n => n.Date).ToListAsync());
    }

    private static System.Linq.Expressions.Expression<Func<TEntry, bool>> InRange<TEntry>(DateOnly? from, DateOnly? to)
        where TEntry : Domain.DiaryEntry =>
        entry => (from == null || entry.Date >= from) && (to == null || entry.Date <= to);
}
