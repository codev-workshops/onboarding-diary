using System.Text;
using OnboardingDiary.Api.Domain;
using OnboardingDiary.Api.Features.Feedback;
using OnboardingDiary.Api.Features.Issues;
using OnboardingDiary.Api.Features.Notes;
using OnboardingDiary.Api.Features.Reports;
using OnboardingDiary.Api.Features.Tasks;
using QuestPDF.Infrastructure;

namespace OnboardingDiary.UnitTests;

public class ReportPdfTests
{
    private static readonly DateOnly Day = new(2026, 1, 15);

    private static readonly DateTimeOffset Stamp = new(2026, 1, 20, 9, 0, 0, TimeSpan.Zero);

    /// <summary>A body long enough that a handful of entries overflow an A4 page.</summary>
    private static string Body(string marker, int paragraphs) =>
        string.Join(
            ' ',
            Enumerable
                .Range(0, paragraphs * 20)
                .Select(i => $"{marker}-{i} the recruit documented every step of the onboarding day")
        );

    private static ReportResponse Report(int entriesPerSection, int paragraphs = 6)
    {
        string Text(string marker) => Body(marker, paragraphs);

        var tasks = Enumerable
            .Range(1, entriesPerSection)
            .Select(i => new TaskResponse(
                i,
                1,
                Day,
                $"Task {i}",
                Text($"task{i}"),
                TaskCategory.Training,
                TaskEntryStatus.Done,
                TaskPriority.High,
                null,
                Stamp,
                Stamp,
                Stamp
            ))
            .ToList();

        var issues = Enumerable
            .Range(1, entriesPerSection)
            .Select(i => new IssueResponse(
                i,
                1,
                Day,
                $"Issue {i}",
                Text($"issue{i}"),
                IssueSeverity.High,
                IssueStatus.Resolved,
                Text($"resolution{i}"),
                Stamp,
                Stamp,
                Stamp
            ))
            .ToList();

        var feedback = Enumerable
            .Range(1, entriesPerSection)
            .Select(i => new FeedbackResponse(
                i,
                1,
                Day,
                $"Feedback {i}",
                Text($"feedback{i}"),
                FeedbackType.Positive,
                Stamp,
                Stamp
            ))
            .ToList();

        var notes = Enumerable
            .Range(1, entriesPerSection)
            .Select(i => new NoteResponse(
                i,
                1,
                Day,
                $"Note {i}",
                Text($"note{i}"),
                ["auth"],
                Stamp,
                Stamp
            ))
            .ToList();

        return new ReportResponse(
            new ReportHeader(
                1,
                "Rae Recruit",
                "rae@example.com",
                "Engineering",
                Day,
                Day,
                Day.AddDays(30),
                Stamp
            ),
            new ReportSummary(
                tasks.Count,
                tasks.Count,
                0,
                issues.Count,
                feedback.Count,
                notes.Count
            ),
            ReportRules.AllSections,
            tasks,
            issues,
            feedback,
            notes
        );
    }

    /// <summary>Counts page objects in the uncompressed PDF the renderer produces.</summary>
    private static int PageCount(byte[] pdf)
    {
        var text = Encoding.Latin1.GetString(pdf);
        var count = 0;
        var index = text.IndexOf("/Type /Page", StringComparison.Ordinal);

        while (index >= 0)
        {
            if (!text.AsSpan(index).StartsWith("/Type /Pages"))
            {
                count++;
            }

            index = text.IndexOf("/Type /Page", index + 1, StringComparison.Ordinal);
        }

        return count;
    }

    [Fact]
    public void Long_content_flows_onto_multiple_pages()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        QuestPDF.Settings.EnableDebugging = false;

        var pdf = ReportPdf.Render(Report(entriesPerSection: 6));

        Assert.NotEmpty(pdf);
        Assert.Equal("%PDF", Encoding.ASCII.GetString(pdf, 0, 4));
        Assert.True(PageCount(pdf) > 1, "the long report should span more than one page");
    }

    [Fact]
    public void Bodies_are_rendered_in_full_rather_than_clipped()
    {
        QuestPDF.Settings.License = LicenseType.Community;

        var compact = ReportPdf.Render(Report(entriesPerSection: 1, paragraphs: 1));
        var verbose = ReportPdf.Render(Report(entriesPerSection: 1, paragraphs: 40));

        // Clipping bodies to a fixed height would make both documents the same length.
        Assert.True(
            PageCount(verbose) > PageCount(compact),
            "longer bodies must produce a longer document"
        );
    }
}
