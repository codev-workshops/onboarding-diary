using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Controllers;

/// CRUD for a diary entry type: recruits manage their own entries, managers/admins read them.
[ApiController]
[Authorize]
public abstract class EntryControllerBase<TEntry, TRequest, TResponse>(AppDbContext db, EntryAccess access)
    : ControllerBase
    where TEntry : DiaryEntry, new()
{
    protected AppDbContext Db { get; } = db;

    protected abstract DbSet<TEntry> Entries { get; }
    protected abstract void Apply(TRequest request, TEntry entry);
    protected abstract TResponse Map(TEntry entry);

    /// Applies the type-specific query filters supplied as query-string parameters.
    protected virtual IQueryable<TEntry> Filter(IQueryable<TEntry> query) => query;

    /// Validates cross-field rules that data annotations cannot express. Null means valid.
    protected virtual string? Validate(TRequest request) => null;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TResponse>>> List(
        [FromQuery] Guid? userId,
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        var ownerId = await access.ResolveReadableOwnerAsync(User, userId);
        if (ownerId is null) return Forbid();

        var query = Entries.AsNoTracking().Where(e => e.UserId == ownerId);
        if (date is { } on) query = query.Where(e => e.Date == on);
        if (from is { } start) query = query.Where(e => e.Date >= start);
        if (to is { } end) query = query.Where(e => e.Date <= end);

        var entries = await Filter(query).OrderByDescending(e => e.Date).ThenByDescending(e => e.CreatedAt).ToListAsync();
        return Ok(entries.Select(Map).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TResponse>> Get(Guid id)
    {
        var entry = await Entries.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();
        if (!await access.CanReadAsync(User, entry.UserId)) return Forbid();

        return Ok(Map(entry));
    }

    [HttpPost]
    public async Task<ActionResult<TResponse>> Create(TRequest request)
    {
        if (Validate(request) is { } error) return BadRequest(new ProblemDetails { Title = error });

        var entry = new TEntry { UserId = User.GetUserId() };
        Apply(request, entry);
        Entries.Add(entry);
        await Db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = entry.Id }, Map(entry));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TResponse>> Update(Guid id, TRequest request)
    {
        if (Validate(request) is { } error) return BadRequest(new ProblemDetails { Title = error });

        var entry = await Entries.FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();
        if (entry.UserId != User.GetUserId()) return Forbid();

        Apply(request, entry);
        entry.UpdatedAt = DateTimeOffset.UtcNow;
        await Db.SaveChangesAsync();

        return Ok(Map(entry));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await Entries.FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) return NotFound();
        if (entry.UserId != User.GetUserId()) return Forbid();

        Entries.Remove(entry);
        await Db.SaveChangesAsync();

        return NoContent();
    }
}
