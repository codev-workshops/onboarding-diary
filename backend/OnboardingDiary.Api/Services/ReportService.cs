using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using OnboardingDiary.Api.Data;
using OnboardingDiary.Api.DTOs.Reports;
using OnboardingDiary.Api.Entities;
using OnboardingDiary.Api.Entities.Enums;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace OnboardingDiary.Api.Services;

public class ReportService : IReportService
{
    private readonly AppDbContext _context;

    public ReportService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ReportResponseDto> GenerateReportAsync(ReportRequestDto request, int currentUserId, UserRole currentUserRole)
    {
        ValidateRequest(request);
        var targetUserId = ResolveTargetUser(request, currentUserId, currentUserRole);
        await ValidateUserAccess(targetUserId, currentUserId, currentUserRole);

        var user = await _context.Users.FindAsync(targetUserId)
            ?? throw new KeyNotFoundException("User not found.");

        var currentUser = await _context.Users.FindAsync(currentUserId)
            ?? throw new KeyNotFoundException("Current user not found.");

        var response = new ReportResponseDto
        {
            ReportPeriod = new ReportPeriodDto
            {
                DateFrom = request.DateFrom,
                DateTo = request.DateTo
            },
            GeneratedAt = DateTime.UtcNow,
            GeneratedBy = currentUser.Name,
            GeneratedForUserId = targetUserId,
            GeneratedForUserName = user.Name
        };

        var category = request.Category?.ToLowerInvariant() ?? "all";

        if (category == "all" || category == "tasks")
        {
            response.Tasks = await GetTasksSection(targetUserId, request.DateFrom, request.DateTo);
        }

        if (category == "all" || category == "issues")
        {
            response.Issues = await GetIssuesSection(targetUserId, request.DateFrom, request.DateTo);
        }

        if (category == "all" || category == "feedback")
        {
            response.Feedback = await GetFeedbackSection(targetUserId, request.DateFrom, request.DateTo);
        }

        if (category == "all" || category == "notes")
        {
            response.Notes = await GetNotesSection(targetUserId, request.DateFrom, request.DateTo);
        }

        return response;
    }

    public async Task<byte[]> GeneratePdfAsync(ReportRequestDto request, int currentUserId, UserRole currentUserRole)
    {
        var report = await GenerateReportAsync(request, currentUserId, currentUserRole);
        return GeneratePdfDocument(report);
    }

    public async Task<byte[]> GenerateCsvAsync(ReportRequestDto request, int currentUserId, UserRole currentUserRole)
    {
        var report = await GenerateReportAsync(request, currentUserId, currentUserRole);
        return GenerateCsvDocument(report);
    }

    private static void ValidateRequest(ReportRequestDto request)
    {
        if (request.DateFrom > request.DateTo)
            throw new ArgumentException("DateFrom must be before or equal to DateTo.");

        if (request.DateTo.Date > DateTime.UtcNow.Date)
            throw new ArgumentException("DateTo cannot be in the future.");
    }

    private static int ResolveTargetUser(ReportRequestDto request, int currentUserId, UserRole currentUserRole)
    {
        if (request.UserId.HasValue && currentUserRole != UserRole.Recruit)
        {
            return request.UserId.Value;
        }
        return currentUserId;
    }

    private async Task ValidateUserAccess(int targetUserId, int currentUserId, UserRole currentUserRole)
    {
        if (targetUserId == currentUserId)
            return;

        switch (currentUserRole)
        {
            case UserRole.Recruit:
                throw new UnauthorizedAccessException("Recruits can only view their own reports.");

            case UserRole.Manager:
                var targetUser = await _context.Users.FindAsync(targetUserId)
                    ?? throw new KeyNotFoundException("Target user not found.");
                if (targetUser.Role != UserRole.Recruit || targetUser.ManagerId != currentUserId)
                    throw new UnauthorizedAccessException("You can only generate reports for recruits assigned to you.");
                break;

            case UserRole.Admin:
                break;
        }
    }

    private async Task<ReportSectionDto> GetTasksSection(int userId, DateTime dateFrom, DateTime dateTo)
    {
        var tasks = await _context.TaskEntries
            .Where(t => t.UserId == userId && t.Date >= dateFrom && t.Date <= dateTo)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

        return new ReportSectionDto
        {
            Total = tasks.Count,
            Completed = tasks.Count(t => t.Status == TaskEntryStatus.Completed),
            Resolved = 0,
            Entries = tasks.Select(t => new ReportEntryDto
            {
                Id = t.Id,
                Date = t.Date,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status.ToString(),
                Priority = t.Priority.ToString(),
                Category = t.Category
            }).ToList()
        };
    }

    private async Task<ReportSectionDto> GetIssuesSection(int userId, DateTime dateFrom, DateTime dateTo)
    {
        var issues = await _context.IssueEntries
            .Where(i => i.UserId == userId && i.Date >= dateFrom && i.Date <= dateTo)
            .OrderByDescending(i => i.Date)
            .ToListAsync();

        return new ReportSectionDto
        {
            Total = issues.Count,
            Completed = 0,
            Resolved = issues.Count(i => i.Status == IssueStatus.Resolved || i.Status == IssueStatus.Closed),
            Entries = issues.Select(i => new ReportEntryDto
            {
                Id = i.Id,
                Date = i.Date,
                Title = i.Title,
                Description = i.Description,
                Status = i.Status.ToString(),
                Severity = i.Severity.ToString()
            }).ToList()
        };
    }

    private async Task<ReportSectionDto> GetFeedbackSection(int userId, DateTime dateFrom, DateTime dateTo)
    {
        var feedback = await _context.FeedbackEntries
            .Where(f => f.UserId == userId && f.Date >= dateFrom && f.Date <= dateTo)
            .OrderByDescending(f => f.Date)
            .ToListAsync();

        return new ReportSectionDto
        {
            Total = feedback.Count,
            Completed = 0,
            Resolved = 0,
            Entries = feedback.Select(f => new ReportEntryDto
            {
                Id = f.Id,
                Date = f.Date,
                Title = f.Subject,
                Description = f.Details,
                Type = f.Type.ToString()
            }).ToList()
        };
    }

    private async Task<ReportSectionDto> GetNotesSection(int userId, DateTime dateFrom, DateTime dateTo)
    {
        var notes = await _context.NoteEntries
            .Include(n => n.Tags)
            .Where(n => n.UserId == userId && n.Date >= dateFrom && n.Date <= dateTo)
            .OrderByDescending(n => n.Date)
            .ToListAsync();

        return new ReportSectionDto
        {
            Total = notes.Count,
            Completed = 0,
            Resolved = 0,
            Entries = notes.Select(n => new ReportEntryDto
            {
                Id = n.Id,
                Date = n.Date,
                Title = n.Title,
                Description = n.Content,
                Tags = n.Tags.Any() ? string.Join(", ", n.Tags.Select(t => t.Tag)) : null
            }).ToList()
        };
    }

    private static byte[] GeneratePdfDocument(ReportResponseDto report)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("Onboarding Diary Report").FontSize(18).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().PaddingTop(5).Text($"Period: {report.ReportPeriod.DateFrom:yyyy-MM-dd} to {report.ReportPeriod.DateTo:yyyy-MM-dd}").FontSize(11);
                    col.Item().Text($"Generated for: {report.GeneratedForUserName}").FontSize(11);
                    col.Item().Text($"Generated at: {report.GeneratedAt:yyyy-MM-dd HH:mm} UTC").FontSize(9).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingBottom(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().Column(col =>
                {
                    if (report.Tasks != null)
                    {
                        col.Item().PaddingTop(10).Text("Tasks").FontSize(14).Bold();
                        col.Item().Text($"Total: {report.Tasks.Total} | Completed: {report.Tasks.Completed}").FontSize(10);
                        col.Item().PaddingTop(5).Element(c => RenderTable(c, report.Tasks.Entries, "tasks"));
                    }

                    if (report.Issues != null)
                    {
                        col.Item().PaddingTop(15).Text("Issues").FontSize(14).Bold();
                        col.Item().Text($"Total: {report.Issues.Total} | Resolved: {report.Issues.Resolved}").FontSize(10);
                        col.Item().PaddingTop(5).Element(c => RenderTable(c, report.Issues.Entries, "issues"));
                    }

                    if (report.Feedback != null)
                    {
                        col.Item().PaddingTop(15).Text("Feedback").FontSize(14).Bold();
                        col.Item().Text($"Total: {report.Feedback.Total}").FontSize(10);
                        col.Item().PaddingTop(5).Element(c => RenderTable(c, report.Feedback.Entries, "feedback"));
                    }

                    if (report.Notes != null)
                    {
                        col.Item().PaddingTop(15).Text("Notes").FontSize(14).Bold();
                        col.Item().Text($"Total: {report.Notes.Total}").FontSize(10);
                        col.Item().PaddingTop(5).Element(c => RenderTable(c, report.Notes.Entries, "notes"));
                    }
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        });

        using var stream = new MemoryStream();
        document.GeneratePdf(stream);
        return stream.ToArray();
    }

    private static void RenderTable(IContainer container, List<ReportEntryDto> entries, string sectionType)
    {
        if (entries.Count == 0)
        {
            container.Text("No entries found.").Italic().FontColor(Colors.Grey.Darken1);
            return;
        }

        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(70);  // Date
                columns.RelativeColumn(3);   // Title
                columns.RelativeColumn(2);   // Status/Type
                columns.RelativeColumn(2);   // Extra
            });

            table.Header(header =>
            {
                header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Date").Bold().FontSize(9);
                header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Title").Bold().FontSize(9);

                switch (sectionType)
                {
                    case "tasks":
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Status").Bold().FontSize(9);
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Priority").Bold().FontSize(9);
                        break;
                    case "issues":
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Status").Bold().FontSize(9);
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Severity").Bold().FontSize(9);
                        break;
                    case "feedback":
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Type").Bold().FontSize(9);
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("").Bold().FontSize(9);
                        break;
                    case "notes":
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("Tags").Bold().FontSize(9);
                        header.Cell().Background(Colors.Blue.Lighten4).Padding(4).Text("").Bold().FontSize(9);
                        break;
                }
            });

            foreach (var entry in entries)
            {
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Date.ToString("yyyy-MM-dd")).FontSize(9);
                table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Title).FontSize(9);

                switch (sectionType)
                {
                    case "tasks":
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Status ?? "").FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Priority ?? "").FontSize(9);
                        break;
                    case "issues":
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Status ?? "").FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Severity ?? "").FontSize(9);
                        break;
                    case "feedback":
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Type ?? "").FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("").FontSize(9);
                        break;
                    case "notes":
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(entry.Tags ?? "").FontSize(9);
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("").FontSize(9);
                        break;
                }
            }
        });
    }

    private static byte[] GenerateCsvDocument(ReportResponseDto report)
    {
        using var stream = new MemoryStream();
        using var writer = new StreamWriter(stream, new System.Text.UTF8Encoding(true));
        using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

        csv.WriteField("Category");
        csv.WriteField("Date");
        csv.WriteField("Title");
        csv.WriteField("Description");
        csv.WriteField("Status");
        csv.WriteField("Priority");
        csv.WriteField("Severity");
        csv.WriteField("Type");
        csv.WriteField("Tags");
        csv.NextRecord();

        if (report.Tasks != null)
        {
            foreach (var entry in report.Tasks.Entries)
            {
                csv.WriteField("Task");
                csv.WriteField(entry.Date.ToString("yyyy-MM-dd"));
                csv.WriteField(entry.Title);
                csv.WriteField(entry.Description ?? "");
                csv.WriteField(entry.Status ?? "");
                csv.WriteField(entry.Priority ?? "");
                csv.WriteField("");
                csv.WriteField("");
                csv.WriteField("");
                csv.NextRecord();
            }
        }

        if (report.Issues != null)
        {
            foreach (var entry in report.Issues.Entries)
            {
                csv.WriteField("Issue");
                csv.WriteField(entry.Date.ToString("yyyy-MM-dd"));
                csv.WriteField(entry.Title);
                csv.WriteField(entry.Description ?? "");
                csv.WriteField(entry.Status ?? "");
                csv.WriteField("");
                csv.WriteField(entry.Severity ?? "");
                csv.WriteField("");
                csv.WriteField("");
                csv.NextRecord();
            }
        }

        if (report.Feedback != null)
        {
            foreach (var entry in report.Feedback.Entries)
            {
                csv.WriteField("Feedback");
                csv.WriteField(entry.Date.ToString("yyyy-MM-dd"));
                csv.WriteField(entry.Title);
                csv.WriteField(entry.Description ?? "");
                csv.WriteField("");
                csv.WriteField("");
                csv.WriteField("");
                csv.WriteField(entry.Type ?? "");
                csv.WriteField("");
                csv.NextRecord();
            }
        }

        if (report.Notes != null)
        {
            foreach (var entry in report.Notes.Entries)
            {
                csv.WriteField("Note");
                csv.WriteField(entry.Date.ToString("yyyy-MM-dd"));
                csv.WriteField(entry.Title);
                csv.WriteField(entry.Description ?? "");
                csv.WriteField("");
                csv.WriteField("");
                csv.WriteField("");
                csv.WriteField("");
                csv.WriteField(entry.Tags ?? "");
                csv.NextRecord();
            }
        }

        writer.Flush();
        return stream.ToArray();
    }
}
