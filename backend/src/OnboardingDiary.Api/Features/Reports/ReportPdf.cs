using System.Globalization;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace OnboardingDiary.Api.Features.Reports;

/// <summary>
/// Renders a report as a PDF. Each entry is a compact metadata line with its full body beneath,
/// rather than long text squeezed into table cells; bodies are never truncated and wrap across
/// pages naturally.
/// </summary>
public static class ReportPdf
{
    public const string ContentType = "application/pdf";

    private const float TitleSize = 18;

    private const float HeadingSize = 13;

    private const float BodySize = 10;

    public static byte[] Render(ReportResponse report) =>
        Document
            .Create(container =>
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(30);
                    page.DefaultTextStyle(text => text.FontSize(BodySize).FontColor(Colors.Black));

                    page.Header().Element(header => Header(header, report.Header));
                    page.Content().Element(content => Content(content, report));
                    page.Footer()
                        .AlignCenter()
                        .Text(text =>
                        {
                            text.DefaultTextStyle(style =>
                                style.FontSize(9).FontColor(Colors.Grey.Darken1)
                            );
                            text.Span("Page ");
                            text.CurrentPageNumber();
                            text.Span(" of ");
                            text.TotalPages();
                        });
                })
            )
            .GeneratePdf();

    private static void Header(IContainer container, ReportHeader header)
    {
        container
            .PaddingBottom(12)
            .BorderBottom(1)
            .BorderColor(Colors.Grey.Lighten1)
            .Column(column =>
            {
                column.Spacing(2);
                column.Item().Text("Onboarding Diary Report").FontSize(TitleSize).SemiBold();
                column.Item().Text(header.FullName).FontSize(HeadingSize).SemiBold();
                column
                    .Item()
                    .Text(
                        $"{header.Email} · {header.DepartmentName ?? "No department"}"
                            + (
                                header.StartDate is { } start
                                    ? $" · Started {Format(start)}"
                                    : string.Empty
                            )
                    )
                    .FontColor(Colors.Grey.Darken2);
                column
                    .Item()
                    .Text($"Range: {Range(header)} · Generated {Format(header.GeneratedAt)}")
                    .FontColor(Colors.Grey.Darken2);
            });
    }

    private static void Content(IContainer container, ReportResponse report)
    {
        container
            .PaddingTop(12)
            .Column(column =>
            {
                column.Spacing(14);
                column.Item().Element(summary => Summary(summary, report));

                foreach (var section in report.Sections)
                {
                    column.Item().Element(item => Section(item, report, section));
                }
            });
    }

    private static void Summary(IContainer container, ReportResponse report)
    {
        var summary = report.Summary;
        var rows = new (string Label, string Value)[]
        {
            ("Total tasks", summary.TotalTasks.ToString(CultureInfo.InvariantCulture)),
            ("Completed tasks", summary.CompletedTasks.ToString(CultureInfo.InvariantCulture)),
            ("Open issues", summary.OpenIssues.ToString(CultureInfo.InvariantCulture)),
            ("Resolved issues", summary.ResolvedIssues.ToString(CultureInfo.InvariantCulture)),
            ("Feedback", summary.FeedbackCount.ToString(CultureInfo.InvariantCulture)),
            ("Notes", summary.NoteCount.ToString(CultureInfo.InvariantCulture)),
        };

        container.Column(column =>
        {
            column.Spacing(6);
            column.Item().Text("Summary").FontSize(HeadingSize).SemiBold();
            column
                .Item()
                .Row(row =>
                {
                    foreach (var (label, value) in rows)
                    {
                        row.RelativeItem()
                            .Background(Colors.Grey.Lighten4)
                            .Padding(6)
                            .Column(cell =>
                            {
                                cell.Item().Text(value).FontSize(HeadingSize).SemiBold();
                                cell.Item()
                                    .Text(label)
                                    .FontSize(8)
                                    .FontColor(Colors.Grey.Darken2);
                            });
                    }
                });
        });
    }

    private static void Section(IContainer container, ReportResponse report, ReportSection section)
    {
        container.Column(column =>
        {
            column.Spacing(8);
            column.Item().Text(section.ToString()).FontSize(HeadingSize).SemiBold();

            switch (section)
            {
                case ReportSection.Tasks when report.Tasks.Count > 0:
                    foreach (var task in report.Tasks)
                    {
                        column
                            .Item()
                            .Element(item =>
                                Entry(
                                    item,
                                    task.Title,
                                    $"{Format(task.EntryDate)} · {task.Category} · {task.Status} · {task.Priority}",
                                    task.Description
                                )
                            );
                    }

                    break;

                case ReportSection.Issues when report.Issues.Count > 0:
                    foreach (var issue in report.Issues)
                    {
                        column
                            .Item()
                            .Element(item =>
                                Entry(
                                    item,
                                    issue.Title,
                                    $"{Format(issue.EntryDate)} · {issue.Severity} · {issue.Status}",
                                    issue.Description,
                                    issue.ResolutionNotes is null
                                        ? null
                                        : $"Resolution: {issue.ResolutionNotes}"
                                )
                            );
                    }

                    break;

                case ReportSection.Feedback when report.Feedback.Count > 0:
                    foreach (var feedback in report.Feedback)
                    {
                        column
                            .Item()
                            .Element(item =>
                                Entry(
                                    item,
                                    feedback.Title,
                                    $"{Format(feedback.EntryDate)} · {feedback.Type}",
                                    feedback.Message
                                )
                            );
                    }

                    break;

                case ReportSection.Notes when report.Notes.Count > 0:
                    foreach (var note in report.Notes)
                    {
                        column
                            .Item()
                            .Element(item =>
                                Entry(
                                    item,
                                    note.Title,
                                    Format(note.EntryDate)
                                        + (
                                            note.Tags.Count > 0
                                                ? $" · {string.Join(", ", note.Tags)}"
                                                : string.Empty
                                        ),
                                    note.Content
                                )
                            );
                    }

                    break;

                default:
                    column
                        .Item()
                        .Text("No entries in this range.")
                        .Italic()
                        .FontColor(Colors.Grey.Darken1);
                    break;
            }
        });
    }

    private static void Entry(
        IContainer container,
        string title,
        string meta,
        string? body,
        string? extra = null
    )
    {
        container.Column(column =>
        {
            column.Spacing(2);
            column.Item().Text(title).SemiBold();
            column.Item().Text(meta).FontSize(9).FontColor(Colors.Grey.Darken2);

            if (!string.IsNullOrWhiteSpace(body))
            {
                column.Item().Text(body);
            }

            if (!string.IsNullOrWhiteSpace(extra))
            {
                column.Item().Text(extra).FontColor(Colors.Grey.Darken3);
            }
        });
    }

    private static string Range(ReportHeader header) =>
        header switch
        {
            { From: { } from, To: { } to } => $"{Format(from)} to {Format(to)}",
            { From: { } from } => $"from {Format(from)}",
            { To: { } to } => $"up to {Format(to)}",
            _ => "all entries",
        };

    private static string Format(DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string Format(DateTimeOffset timestamp) =>
        timestamp.UtcDateTime.ToString("yyyy-MM-dd HH:mm 'UTC'", CultureInfo.InvariantCulture);
}
