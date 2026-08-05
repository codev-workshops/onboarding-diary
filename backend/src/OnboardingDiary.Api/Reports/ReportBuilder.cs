using System.Globalization;
using System.Text;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using OnboardingDiary.Api.Domain;

namespace OnboardingDiary.Api.Reports;

/// All diary data for one recruit over a date range.
public record ReportData(
    User Recruit,
    DateOnly? From,
    DateOnly? To,
    IReadOnlyList<TaskEntry> Tasks,
    IReadOnlyList<IssueEntry> Issues,
    IReadOnlyList<FeedbackNote> Feedback,
    IReadOnlyList<Note> Notes);

public static class ReportBuilder
{
    public static byte[] ToCsv(ReportData data)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Type,Date,Title,Category/Severity/Type,Status,Details");

        foreach (var task in data.Tasks)
        {
            AppendRow(csv, "Task", task.Date, task.Title, task.Category.ToString(), task.Status.ToString(), task.Description);
        }

        foreach (var issue in data.Issues)
        {
            AppendRow(csv, "Issue", issue.Date, issue.Title, issue.Severity.ToString(), issue.Status.ToString(), issue.Description);
        }

        foreach (var feedback in data.Feedback)
        {
            AppendRow(csv, "Feedback", feedback.Date, feedback.Subject, feedback.Type.ToString(), string.Empty, feedback.Details);
        }

        foreach (var note in data.Notes)
        {
            AppendRow(csv, "Note", note.Date, note.Title, string.Join(' ', note.Tags), string.Empty, note.Content);
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public static byte[] ToPdf(ReportData data)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30);
                page.DefaultTextStyle(style => style.FontSize(10));

                page.Header().Column(header =>
                {
                    header.Item().Text($"Onboarding diary – {data.Recruit.FullName}").FontSize(16).Bold();
                    header.Item().Text(
                        $"{data.Recruit.Department} · started {data.Recruit.StartDate:yyyy-MM-dd} · range {Format(data.From)} to {Format(data.To)}")
                        .FontColor(Colors.Grey.Darken1);
                });

                page.Content().PaddingVertical(10).Column(column =>
                {
                    column.Spacing(10);
                    Section(column, "Tasks", data.Tasks.Select(t =>
                        $"{t.Date:yyyy-MM-dd} · {t.Title} · {t.Category} · {t.Status} · {t.Priority}"));
                    Section(column, "Issues", data.Issues.Select(i =>
                        $"{i.Date:yyyy-MM-dd} · {i.Title} · {i.Severity} · {i.Status}"));
                    Section(column, "Feedback", data.Feedback.Select(f =>
                        $"{f.Date:yyyy-MM-dd} · {f.Subject} · {f.Type}"));
                    Section(column, "Notes", data.Notes.Select(n => $"{n.Date:yyyy-MM-dd} · {n.Title}"));
                });

                page.Footer().AlignRight().Text(text =>
                {
                    text.CurrentPageNumber();
                    text.Span(" / ");
                    text.TotalPages();
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void Section(ColumnDescriptor column, string title, IEnumerable<string> lines)
    {
        var items = lines.ToList();
        column.Item().Text(title).FontSize(13).Bold();
        if (items.Count == 0)
        {
            column.Item().Text("None recorded.").FontColor(Colors.Grey.Darken1);
            return;
        }

        foreach (var line in items)
        {
            column.Item().Text($"• {line}");
        }
    }

    private static string Format(DateOnly? date) => date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? "start";

    private static void AppendRow(StringBuilder csv, string type, DateOnly date, string title, string classification, string status, string? details)
    {
        csv.AppendLine(string.Join(',', new[]
        {
            type,
            date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Escape(title),
            Escape(classification),
            Escape(status),
            Escape(details ?? string.Empty),
        }));
    }

    private static string Escape(string value) => $"\"{value.Replace("\"", "\"\"")}\"";
}
