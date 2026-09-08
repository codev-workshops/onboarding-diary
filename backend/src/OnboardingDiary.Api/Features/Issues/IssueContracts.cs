using FluentValidation;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Issues;

public record CreateIssueRequest(
    DateOnly EntryDate,
    string Title,
    string? Description,
    IssueSeverity Severity
);

public record UpdateIssueRequest(
    DateOnly EntryDate,
    string Title,
    string? Description,
    IssueSeverity Severity,
    IssueStatus Status,
    string? ResolutionNotes
);

public record IssueResponse(
    int Id,
    int UserId,
    DateOnly EntryDate,
    string Title,
    string? Description,
    IssueSeverity Severity,
    IssueStatus Status,
    string? ResolutionNotes,
    DateTimeOffset? ResolvedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
)
{
    public static IssueResponse From(IssueEntry issue) =>
        new(
            issue.Id,
            issue.UserId,
            issue.EntryDate,
            issue.Title,
            issue.Description,
            issue.Severity,
            issue.Status,
            issue.ResolutionNotes,
            issue.ResolvedAt,
            issue.CreatedAt,
            issue.UpdatedAt
        );
}

public record IssueListQuery(
    DateOnly? From,
    DateOnly? To,
    IssueSeverity? Severity,
    IssueStatus? Status,
    string? Q,
    int? UserId,
    int Page = 1,
    int PageSize = 20
);

/// <summary>
/// Allowed issue status transitions. Resolved and closed issues can be reopened, which clears the
/// resolution timestamp again.
/// </summary>
public static class IssueTransitions
{
    private static readonly Dictionary<IssueStatus, IssueStatus[]> Allowed = new()
    {
        [IssueStatus.Open] = [IssueStatus.Open, IssueStatus.InProgress, IssueStatus.Resolved],
        [IssueStatus.InProgress] =
        [
            IssueStatus.InProgress,
            IssueStatus.Open,
            IssueStatus.Resolved,
        ],
        [IssueStatus.Resolved] = [IssueStatus.Resolved, IssueStatus.Closed, IssueStatus.Open],
        [IssueStatus.Closed] = [IssueStatus.Closed, IssueStatus.Open],
    };

    public static bool CanMove(IssueStatus from, IssueStatus to) => Allowed[from].Contains(to);

    public static bool RequiresResolutionNotes(IssueStatus status) =>
        status is IssueStatus.Resolved or IssueStatus.Closed;
}

public class CreateIssueRequestValidator : AbstractValidator<CreateIssueRequest>
{
    public CreateIssueRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Description).MaximumLength(5000);
        RuleFor(r => r.Severity).IsInEnum();
    }
}

public class UpdateIssueRequestValidator : AbstractValidator<UpdateIssueRequest>
{
    public UpdateIssueRequestValidator(TimeProvider timeProvider)
    {
        RuleFor(r => r.EntryDate).EntryDate(timeProvider);
        RuleFor(r => r.Title).Title();
        RuleFor(r => r.Description).MaximumLength(5000);
        RuleFor(r => r.Severity).IsInEnum();
        RuleFor(r => r.Status).IsInEnum();
        RuleFor(r => r.ResolutionNotes).MaximumLength(5000);
        RuleFor(r => r.ResolutionNotes)
            .NotEmpty()
            .When(r => IssueTransitions.RequiresResolutionNotes(r.Status))
            .WithMessage("Resolution notes are required when an issue is resolved or closed.");
    }
}
