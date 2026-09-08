using FluentValidation;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Features.Tasks;

namespace OnboardingDiary.Api.Features.Reports;

public enum ReportSection
{
    Tasks,
    Issues,
    Feedback,
    Notes,
}

public enum ReportFormat
{
    Csv,
    Pdf,
}

public record ReportQuery(
    int? UserId,
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<ReportSection> Sections
);

public record ReportHeader(
    int UserId,
    string FullName,
    string Email,
    string? DepartmentName,
    DateOnly? StartDate,
    DateOnly? From,
    DateOnly? To,
    DateTimeOffset GeneratedAt
);

public record ReportSummary(
    int TotalTasks,
    int CompletedTasks,
    int OpenIssues,
    int ResolvedIssues,
    int FeedbackCount,
    int NoteCount
);

/// <summary>
/// The whole report in one shape: the JSON preview, the CSV and the PDF are all rendered from
/// this, so a download can never disagree with what was previewed.
/// </summary>
public record ReportResponse(
    ReportHeader Header,
    ReportSummary Summary,
    IReadOnlyList<ReportSection> Sections,
    IReadOnlyList<TaskResponse> Tasks,
    IReadOnlyList<IssueResponse> Issues,
    IReadOnlyList<FeedbackResponse> Feedback,
    IReadOnlyList<NoteResponse> Notes
);

public static class ReportRules
{
    public const int MaxRangeDays = 366;

    public static readonly IReadOnlyList<ReportSection> AllSections = Enum.GetValues<ReportSection>();

    /// <summary>Parses the repeated <c>sections</c> query value; empty means every section.</summary>
    public static IReadOnlyList<ReportSection> ParseSections(string[]? sections)
    {
        if (sections is null || sections.Length == 0)
        {
            return AllSections;
        }

        var parsed = sections
            .SelectMany(value => value.Split(',', StringSplitOptions.RemoveEmptyEntries))
            .Select(value =>
                Enum.TryParse<ReportSection>(value.Trim(), ignoreCase: true, out var section)
                    ? section
                    : (ReportSection?)null
            )
            .Where(section => section is not null)
            .Select(section => section!.Value)
            .Distinct()
            .ToList();

        return parsed.Count == 0 ? AllSections : AllSections.Where(parsed.Contains).ToList();
    }

    /// <summary>The download filename, e.g. <c>rae-recruit-2026-01-01-2026-01-31.csv</c>.</summary>
    public static string FileName(ReportHeader header, ReportFormat format)
    {
        var slug = new string(
            header
                .FullName.ToLowerInvariant()
                .Select(c => char.IsLetterOrDigit(c) ? c : '-')
                .ToArray()
        ).Trim('-');

        while (slug.Contains("--", StringComparison.Ordinal))
        {
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        }

        var range = header switch
        {
            { From: { } from, To: { } to } => $"{from:yyyy-MM-dd}-{to:yyyy-MM-dd}",
            { From: { } from } => $"from-{from:yyyy-MM-dd}",
            { To: { } to } => $"to-{to:yyyy-MM-dd}",
            _ => "all",
        };

        var extension = format == ReportFormat.Csv ? "csv" : "pdf";
        return $"{(slug.Length == 0 ? "recruit" : slug)}-{range}.{extension}";
    }
}

public class ReportQueryValidator : AbstractValidator<ReportQuery>
{
    public ReportQueryValidator()
    {
        RuleFor(q => q.To)
            .GreaterThanOrEqualTo(q => q.From!.Value)
            .When(q => q.From is not null && q.To is not null)
            .WithMessage("The end of the range cannot be before the start.");

        RuleFor(q => q.To)
            .Must((query, to) => to!.Value.DayNumber - query.From!.Value.DayNumber
                < ReportRules.MaxRangeDays
            )
            .When(q => q.From is not null && q.To is not null && q.To >= q.From)
            .WithMessage($"The range cannot be longer than {ReportRules.MaxRangeDays} days.");
    }
}
