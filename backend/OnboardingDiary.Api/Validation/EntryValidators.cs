using FluentValidation;
using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Validation;

public class SaveTaskRequestValidator : AbstractValidator<SaveTaskRequest>
{
    public SaveTaskRequestValidator()
    {
        RuleFor(x => x.Date).ValidEntryDate();
        RuleFor(x => x.Title).RequiredTitle();
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Priority).IsInEnum();
    }
}

public class SaveIssueRequestValidator : AbstractValidator<SaveIssueRequest>
{
    public SaveIssueRequestValidator()
    {
        RuleFor(x => x.Date).ValidEntryDate();
        RuleFor(x => x.Title).RequiredTitle();
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.ResolutionNotes).MaximumLength(2000);
        RuleFor(x => x.Severity).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
    }
}

public class SaveFeedbackRequestValidator : AbstractValidator<SaveFeedbackRequest>
{
    public SaveFeedbackRequestValidator()
    {
        RuleFor(x => x.Date).ValidEntryDate();
        RuleFor(x => x.Subject).NotEmpty().WithMessage("Subject is required.").MaximumLength(200);
        RuleFor(x => x.Details).MaximumLength(2000);
        RuleFor(x => x.Type).IsInEnum();
    }
}

public class SaveNoteRequestValidator : AbstractValidator<SaveNoteRequest>
{
    public SaveNoteRequestValidator()
    {
        RuleFor(x => x.Date).ValidEntryDate();
        RuleFor(x => x.Title).RequiredTitle();
        RuleFor(x => x.Content).MaximumLength(5000);
        RuleFor(x => x.Tags).Must(tags => tags.Count <= 10).WithMessage("A note can have at most 10 tags.");
        RuleForEach(x => x.Tags)
            .NotEmpty()
            .MaximumLength(30)
            .Must(tag => !tag.Contains(',', StringComparison.Ordinal))
            .WithMessage("Tags cannot contain commas.");
    }
}

public class ReportQueryValidator : AbstractValidator<ReportQuery>
{
    public ReportQueryValidator()
    {
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Format).IsInEnum();
        RuleFor(x => x.From).NotNull().WithMessage("A 'from' date is required.");
        RuleFor(x => x.To).NotNull().WithMessage("A 'to' date is required.");
        RuleFor(x => x)
            .Must(x => x.From is null || x.To is null || x.From <= x.To)
            .WithMessage("'from' must be earlier than or equal to 'to'.")
            .Must(x => x.From is null || x.To is null || (x.To.Value - x.From.Value).TotalDays <= 366)
            .WithMessage("The report date range cannot exceed 366 days.");
    }
}

public class PagedQueryValidator : AbstractValidator<PagedQuery>
{
    public PagedQueryValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x)
            .Must(x => x.From is null || x.To is null || x.From <= x.To)
            .WithMessage("'from' must be earlier than or equal to 'to'.");
    }
}

public class TaskQueryValidator : AbstractValidator<TaskQuery>
{
    public TaskQueryValidator()
    {
        Include(new PagedQueryValidator());
    }
}

public class IssueQueryValidator : AbstractValidator<IssueQuery>
{
    public IssueQueryValidator()
    {
        Include(new PagedQueryValidator());
    }
}

public class FeedbackQueryValidator : AbstractValidator<FeedbackQuery>
{
    public FeedbackQueryValidator()
    {
        Include(new PagedQueryValidator());
    }
}

public class NoteQueryValidator : AbstractValidator<NoteQuery>
{
    public NoteQueryValidator()
    {
        Include(new PagedQueryValidator());
        RuleFor(x => x.Tag).MaximumLength(30);
    }
}
