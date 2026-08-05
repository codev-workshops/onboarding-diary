using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Controllers;

[Route("api/issues")]
public class IssuesController(AppDbContext db, EntryAccess access)
    : EntryControllerBase<IssueEntry, IssueEntryRequest, IssueEntryResponse>(db, access)
{
    [FromQuery(Name = "severity")]
    public IssueSeverity? Severity { get; set; }

    [FromQuery(Name = "status")]
    public IssueStatus? Status { get; set; }

    protected override DbSet<IssueEntry> Entries => Db.Issues;

    protected override IQueryable<IssueEntry> Filter(IQueryable<IssueEntry> query)
    {
        if (Severity is { } severity) query = query.Where(i => i.Severity == severity);
        if (Status is { } status) query = query.Where(i => i.Status == status);
        return query;
    }

    protected override string? Validate(IssueEntryRequest request) =>
        request.Status is IssueStatus.Resolved or IssueStatus.Closed
        && string.IsNullOrWhiteSpace(request.ResolutionNotes)
            ? "Resolution notes are required when an issue is resolved or closed."
            : null;

    protected override void Apply(IssueEntryRequest request, IssueEntry entry)
    {
        entry.Date = request.Date;
        entry.Title = request.Title.Trim();
        entry.Description = request.Description.Trim();
        entry.Severity = request.Severity;
        entry.Status = request.Status;
        entry.ResolutionNotes = request.ResolutionNotes?.Trim();
    }

    protected override IssueEntryResponse Map(IssueEntry entry) => IssueEntryResponse.From(entry);
}
