using System.Globalization;
using System.Text;
using CsvHelper;

namespace OnboardingDiary.Api.Features.Reports;

/// <summary>
/// Renders a report as one CSV with a fixed column set and a <c>Section</c> column, so a combined
/// report is a single file. Columns that do not apply to a section are left empty. Bodies are
/// written in full — the CSV is a complete export, not a summary.
/// </summary>
public static class ReportCsv
{
    public const string ContentType = "text/csv";

    private static readonly string[] Headers =
    [
        "Section",
        "Date",
        "Title",
        "Category",
        "Priority",
        "Status",
        "Severity",
        "Type",
        "Tags",
        "Body",
        "Resolution Notes",
    ];

    public static byte[] Render(ReportResponse report)
    {
        using var buffer = new MemoryStream();

        using (var writer = new StreamWriter(buffer, new UTF8Encoding(false), leaveOpen: true))
        using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
        {
            foreach (var header in Headers)
            {
                csv.WriteField(header);
            }

            csv.NextRecord();

            foreach (var section in report.Sections)
            {
                switch (section)
                {
                    case ReportSection.Tasks:
                        foreach (var task in report.Tasks)
                        {
                            WriteRow(
                                csv,
                                "Tasks",
                                task.EntryDate,
                                task.Title,
                                category: task.Category.ToString(),
                                priority: task.Priority.ToString(),
                                status: task.Status.ToString(),
                                body: task.Description
                            );
                        }

                        break;

                    case ReportSection.Issues:
                        foreach (var issue in report.Issues)
                        {
                            WriteRow(
                                csv,
                                "Issues",
                                issue.EntryDate,
                                issue.Title,
                                status: issue.Status.ToString(),
                                severity: issue.Severity.ToString(),
                                body: issue.Description,
                                resolutionNotes: issue.ResolutionNotes
                            );
                        }

                        break;

                    case ReportSection.Feedback:
                        foreach (var feedback in report.Feedback)
                        {
                            WriteRow(
                                csv,
                                "Feedback",
                                feedback.EntryDate,
                                feedback.Title,
                                type: feedback.Type.ToString(),
                                body: feedback.Message
                            );
                        }

                        break;

                    case ReportSection.Notes:
                        foreach (var note in report.Notes)
                        {
                            WriteRow(
                                csv,
                                "Notes",
                                note.EntryDate,
                                note.Title,
                                tags: string.Join(' ', note.Tags),
                                body: note.Content
                            );
                        }

                        break;
                }
            }
        }

        return buffer.ToArray();
    }

    private static void WriteRow(
        CsvWriter csv,
        string section,
        DateOnly entryDate,
        string title,
        string? category = null,
        string? priority = null,
        string? status = null,
        string? severity = null,
        string? type = null,
        string? tags = null,
        string? body = null,
        string? resolutionNotes = null
    )
    {
        csv.WriteField(section);
        csv.WriteField(entryDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        csv.WriteField(title);
        csv.WriteField(category ?? string.Empty);
        csv.WriteField(priority ?? string.Empty);
        csv.WriteField(status ?? string.Empty);
        csv.WriteField(severity ?? string.Empty);
        csv.WriteField(type ?? string.Empty);
        csv.WriteField(tags ?? string.Empty);
        csv.WriteField(body ?? string.Empty);
        csv.WriteField(resolutionNotes ?? string.Empty);
        csv.NextRecord();
    }
}
