using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Controllers;

[Route("api/notes")]
public class NotesController(AppDbContext db, EntryAccess access)
    : EntryControllerBase<Note, NoteRequest, NoteResponse>(db, access)
{
    [FromQuery(Name = "tag")]
    public string? Tag { get; set; }

    [FromQuery(Name = "search")]
    public string? Search { get; set; }

    protected override DbSet<Note> Entries => Db.Notes;

    protected override IQueryable<Note> Filter(IQueryable<Note> query)
    {
        if (!string.IsNullOrWhiteSpace(Tag))
        {
            var tag = Tag.Trim().ToLowerInvariant();
            query = query.Where(n => n.Tags.Contains(tag));
        }

        if (!string.IsNullOrWhiteSpace(Search))
        {
            var search = Search.Trim();
            query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
        }

        return query;
    }

    protected override string? Validate(NoteRequest request)
    {
        var tags = NormalizeTags(request.Tags);
        if (tags.Count > 10) return "A note can have at most 10 tags.";
        return tags.Any(tag => tag.Length > 30 || !tag.All(c => char.IsLetterOrDigit(c) || c == '-'))
            ? "Tags must be 1-30 characters and contain only letters, digits or hyphens."
            : null;
    }

    protected override void Apply(NoteRequest request, Note entry)
    {
        entry.Date = request.Date;
        entry.Title = request.Title.Trim();
        entry.Content = request.Content.Trim();
        entry.Tags = NormalizeTags(request.Tags);
    }

    protected override NoteResponse Map(Note entry) => NoteResponse.From(entry);

    private static List<string> NormalizeTags(IReadOnlyList<string>? tags) =>
        (tags ?? [])
        .Select(tag => tag.Trim().ToLowerInvariant())
        .Where(tag => tag.Length > 0)
        .Distinct()
        .ToList();
}
