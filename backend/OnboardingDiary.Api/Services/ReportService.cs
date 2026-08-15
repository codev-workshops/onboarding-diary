using System.Globalization;
using System.Text;
using CsvHelper;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Common;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.Dtos;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace OnboardingDiary.Api.Services;

public class ReportService : IReportService
{
    private static readonly string[] ColumnTitles =
        ["Section", "Date", "Title", "Category", "Status", "Level", "Details"];

    private readonly AppDbContext _db;
    private readonly IAccessService _access;

    public ReportService(AppDbContext db, IAccessService access)
    {
        _db = db;
        _access = access;
    }

    public async Task<ReportFile> GenerateAsync(ReportQuery query, CancellationToken cancellationToken = default)
    {
        var userId = await _access.ResolveReadableUserIdAsync(query.RecruitId, cancellationToken);
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw AppException.NotFound("User not found.");

        var from = query.From!.Value.ToUtcDate();
        var to = query.To!.Value.ToUtcDate();

        var rows = new List<ReportRow>();

        if (query.Type is ReportType.Tasks or ReportType.Combined)
        {
            var tasks = await _db.Tasks.AsNoTracking()
                .Where(t => t.UserId == userId && t.Date >= from && t.Date <= to)
                .OrderBy(t => t.Date)
                .ToListAsync(cancellationToken);
            rows.AddRange(tasks.Select(t => new ReportRow(
                "Task", t.Date, t.Title, t.Category.ToString(), t.Status.ToString(), t.Priority.ToString(),
                t.Description)));
        }

        if (query.Type is ReportType.Issues or ReportType.Combined)
        {
            var issues = await _db.Issues.AsNoTracking()
                .Where(i => i.UserId == userId && i.Date >= from && i.Date <= to)
                .OrderBy(i => i.Date)
                .ToListAsync(cancellationToken);
            rows.AddRange(issues.Select(i => new ReportRow(
                "Issue", i.Date, i.Title, "-", i.Status.ToString(), i.Severity.ToString(),
                string.Join(" | ", new[] { i.Description, i.ResolutionNotes }.Where(v => !string.IsNullOrWhiteSpace(v))))));
        }

        if (query.Type is ReportType.Feedback or ReportType.Combined)
        {
            var feedback = await _db.Feedback.AsNoTracking()
                .Where(f => f.UserId == userId && f.Date >= from && f.Date <= to)
                .OrderBy(f => f.Date)
                .ToListAsync(cancellationToken);
            rows.AddRange(feedback.Select(f => new ReportRow(
                "Feedback", f.Date, f.Subject, f.Type.ToString(), "-", "-", f.Details)));
        }

        rows = rows.OrderBy(r => r.Date).ThenBy(r => r.Section).ToList();

        var stamp = $"{from:yyyyMMdd}-{to:yyyyMMdd}";
        var baseName = $"onboarding-{query.Type.ToString().ToLowerInvariant()}-{user.Id}-{stamp}";

        return query.Format == ReportFormat.Csv
            ? new ReportFile
            {
                Content = BuildCsv(rows),
                ContentType = "text/csv",
                FileName = $"{baseName}.csv"
            }
            : new ReportFile
            {
                Content = BuildPdf(rows, user.FullName, query.Type.ToString(), from, to),
                ContentType = "application/pdf",
                FileName = $"{baseName}.pdf"
            };
    }

    private static byte[] BuildCsv(IReadOnlyList<ReportRow> rows)
    {
        using var buffer = new MemoryStream();
        using (var writer = new StreamWriter(buffer, new UTF8Encoding(true), leaveOpen: true))
        using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
        {
            csv.WriteHeader<ReportRow>();
            csv.NextRecord();
            foreach (var row in rows)
            {
                csv.WriteRecord(row);
                csv.NextRecord();
            }
        }

        return buffer.ToArray();
    }

    private static byte[] BuildPdf(
        IReadOnlyList<ReportRow> rows,
        string recruitName,
        string type,
        DateTime from,
        DateTime to)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(24);
                page.DefaultTextStyle(style => style.FontSize(9));

                page.Header().Column(column =>
                {
                    column.Item().Text($"Onboarding Diary — {type} report").FontSize(16).SemiBold();
                    column.Item().Text($"{recruitName} · {from:yyyy-MM-dd} to {to:yyyy-MM-dd}").FontSize(10);
                });

                page.Content().PaddingVertical(10).Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.ConstantColumn(55);
                        columns.ConstantColumn(65);
                        columns.RelativeColumn(3);
                        columns.ConstantColumn(70);
                        columns.ConstantColumn(70);
                        columns.ConstantColumn(60);
                        columns.RelativeColumn(4);
                    });

                    table.Header(header =>
                    {
                        foreach (var title in ColumnTitles)
                        {
                            header.Cell().Element(CellStyle).Text(title).SemiBold();
                        }
                    });

                    foreach (var row in rows)
                    {
                        table.Cell().Element(CellStyle).Text(row.Section);
                        table.Cell().Element(CellStyle).Text(row.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
                        table.Cell().Element(CellStyle).Text(row.Title);
                        table.Cell().Element(CellStyle).Text(row.Category);
                        table.Cell().Element(CellStyle).Text(row.Status);
                        table.Cell().Element(CellStyle).Text(row.Level);
                        table.Cell().Element(CellStyle).Text(row.Details ?? string.Empty);
                    }
                });

                page.Footer().AlignRight().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        }).GeneratePdf();

        static IContainer CellStyle(IContainer container) =>
            container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(4).PaddingRight(4);
    }

    public record ReportRow(
        string Section,
        DateTime Date,
        string Title,
        string Category,
        string Status,
        string Level,
        string? Details);
}
