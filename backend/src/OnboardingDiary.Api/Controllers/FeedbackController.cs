using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Auth;
using OnboardingDiary.Api.Contracts;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Controllers;

[Route("api/feedback")]
public class FeedbackController(AppDbContext db, EntryAccess access)
    : EntryControllerBase<FeedbackNote, FeedbackRequest, FeedbackResponse>(db, access)
{
    [FromQuery(Name = "type")]
    public FeedbackType? Type { get; set; }

    protected override DbSet<FeedbackNote> Entries => Db.Feedback;

    protected override IQueryable<FeedbackNote> Filter(IQueryable<FeedbackNote> query) =>
        Type is { } type ? query.Where(f => f.Type == type) : query;

    protected override void Apply(FeedbackRequest request, FeedbackNote entry)
    {
        entry.Date = request.Date;
        entry.Subject = request.Subject.Trim();
        entry.Type = request.Type;
        entry.Details = request.Details.Trim();
    }

    protected override FeedbackResponse Map(FeedbackNote entry) => FeedbackResponse.From(entry);
}
