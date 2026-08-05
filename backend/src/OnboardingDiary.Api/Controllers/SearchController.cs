using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/search")]
public class SearchController(AppDbContext db, EntryAccess access) : ControllerBase
{
    private const int MaxResultsPerKind = 20;

    /// Full-text-ish search across every diary entry type for one recruit.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<SearchResult>>> Search([FromQuery] string q, [FromQuery] Guid? userId)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest(new ProblemDetails { Title = "A search term is required." });

        var ownerId = await access.ResolveReadableOwnerAsync(User, userId);
        if (ownerId is null) return Forbid();

        var term = q.Trim().ToLowerInvariant();

        var tasks = await db.Tasks.AsNoTracking()
            .Where(t => t.UserId == ownerId && (t.Title.ToLower().Contains(term) || (t.Description ?? "").ToLower().Contains(term)))
            .OrderByDescending(t => t.Date).Take(MaxResultsPerKind)
            .Select(t => new SearchResult("Task", t.Id, t.Title, t.Description ?? "", t.Date))
            .ToListAsync();

        var issues = await db.Issues.AsNoTracking()
            .Where(i => i.UserId == ownerId && (i.Title.ToLower().Contains(term) || i.Description.ToLower().Contains(term)))
            .OrderByDescending(i => i.Date).Take(MaxResultsPerKind)
            .Select(i => new SearchResult("Issue", i.Id, i.Title, i.Description, i.Date))
            .ToListAsync();

        var feedback = await db.Feedback.AsNoTracking()
            .Where(f => f.UserId == ownerId && (f.Subject.ToLower().Contains(term) || f.Details.ToLower().Contains(term)))
            .OrderByDescending(f => f.Date).Take(MaxResultsPerKind)
            .Select(f => new SearchResult("Feedback", f.Id, f.Subject, f.Details, f.Date))
            .ToListAsync();

        var notes = await db.Notes.AsNoTracking()
            .Where(n => n.UserId == ownerId && (n.Title.ToLower().Contains(term) || n.Content.ToLower().Contains(term)))
            .OrderByDescending(n => n.Date).Take(MaxResultsPerKind)
            .Select(n => new SearchResult("Note", n.Id, n.Title, n.Content, n.Date))
            .ToListAsync();

        var results = tasks.Concat(issues).Concat(feedback).Concat(notes)
            .OrderByDescending(r => r.Date)
            .ToList();

        return Ok(results);
    }
}
