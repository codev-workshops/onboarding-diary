using FluentValidation;

namespace OnboardingDiary.Api.Features.Dashboard;

/// <summary>
/// One day of activity. <paramref name="TasksLogged" />, <paramref name="IssuesOpened" />,
/// <paramref name="FeedbackCount" /> and <paramref name="NoteCount" /> count entries by their
/// recruit-selected diary date; <paramref name="TasksCompleted" /> and
/// <paramref name="IssuesResolved" /> count lifecycle timestamps by their UTC date.
/// </summary>
public record TrendDay(
    DateOnly Date,
    int TasksLogged,
    int TasksCompleted,
    int IssuesOpened,
    int IssuesResolved,
    int FeedbackCount,
    int NoteCount
);

public record TrendsResponse(int UserId, DateOnly From, DateOnly To, IReadOnlyList<TrendDay> Days);

public record TrendsQuery(DateOnly? From, DateOnly? To, int? UserId);

public class TrendsQueryValidator : AbstractValidator<TrendsQuery>
{
    public const int MaxRangeDays = 366;

    public const int DefaultRangeDays = 30;

    public TrendsQueryValidator()
    {
        RuleFor(q => q.To)
            .GreaterThanOrEqualTo(q => q.From!.Value)
            .When(q => q.From is not null && q.To is not null)
            .WithMessage("The end of the range cannot be before its start.");

        RuleFor(q => q.To)
            .Must((query, to) => to!.Value.DayNumber - query.From!.Value.DayNumber < MaxRangeDays)
            .When(q => q.From is not null && q.To is not null && q.To >= q.From)
            .WithMessage($"The range cannot be longer than {MaxRangeDays} days.");
    }
}
