using OnboardingDiary.Application.Reports;
using OnboardingDiary.Domain.Entities;
using OnboardingDiary.Domain.Enums;
using OnboardingDiary.Infrastructure.Reports;
using QuestPDF.Infrastructure;
using FeedbackEntity = OnboardingDiary.Domain.Entities.Feedback;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Tests.Reports;

public class PdfReportRendererTests
{
    static PdfReportRendererTests()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    [Fact]
    public void Render_WithData_ProducesNonEmptyBytes()
    {
        var renderer = new PdfReportRenderer();
        var data = CreateSampleData();

        var result = renderer.Render(data);

        Assert.NotNull(result);
        Assert.True(result.Length > 0);
        Assert.Equal(ReportFormat.Pdf, renderer.Format);
    }

    [Fact]
    public void Render_WithEmptyData_ProducesNonEmptyBytes()
    {
        var renderer = new PdfReportRenderer();
        var data = new ReportData
        {
            RecruitName = "Test User",
            Department = "Engineering",
            ReportStartDate = DateTime.UtcNow.AddDays(-30),
            ReportEndDate = DateTime.UtcNow,
            GeneratedByName = "Admin",
            Categories = new List<string> { "tasks" }
        };

        var result = renderer.Render(data);

        Assert.NotNull(result);
        Assert.True(result.Length > 0);
    }

    private static ReportData CreateSampleData() => new()
    {
        RecruitName = "John Doe",
        Department = "Engineering",
        RecruitStartDate = DateTime.UtcNow.AddDays(-60),
        ReportStartDate = DateTime.UtcNow.AddDays(-30),
        ReportEndDate = DateTime.UtcNow,
        GeneratedByName = "Admin User",
        Categories = new List<string> { "tasks", "issues", "feedback", "notes" },
        Tasks = new List<TaskEntity>
        {
            new()
            {
                Date = DateTime.UtcNow.AddDays(-5),
                Title = "Complete training",
                Category = TaskCategory.Training,
                Status = TaskStatus.Completed,
                Priority = Priority.Medium
            }
        },
        Issues = new List<Issue>
        {
            new()
            {
                Date = DateTime.UtcNow.AddDays(-3),
                Title = "VPN issue",
                Description = "Cannot connect to VPN",
                Severity = IssueSeverity.Medium,
                Status = IssueStatus.Open,
                IsEscalated = false
            }
        },
        Feedbacks = new List<FeedbackEntity>
        {
            new()
            {
                Date = DateTime.UtcNow.AddDays(-2),
                Subject = "Great onboarding",
                Type = FeedbackType.Positive,
                Details = "The onboarding experience was excellent."
            }
        },
        Notes = new List<Note>
        {
            new()
            {
                Date = DateTime.UtcNow.AddDays(-1),
                Title = "Day 1 notes",
                Content = "Met the team and set up my workstation.",
                Tags = new List<string> { "day1", "setup" }
            }
        }
    };
}

public class CsvReportRendererTests
{
    [Fact]
    public void Render_WithData_ProducesNonEmptyCsv()
    {
        var renderer = new CsvReportRenderer();
        var data = new ReportData
        {
            RecruitName = "Jane Doe",
            Department = "Marketing",
            ReportStartDate = DateTime.UtcNow.AddDays(-30),
            ReportEndDate = DateTime.UtcNow,
            GeneratedByName = "Admin",
            Categories = new List<string> { "tasks", "notes" },
            Tasks = new List<TaskEntity>
            {
                new()
                {
                    Date = DateTime.UtcNow.AddDays(-5),
                    Title = "Task with, comma",
                    Description = "Description with \"quotes\"",
                    Category = TaskCategory.Documentation,
                    Status = TaskStatus.InProgress,
                    Priority = Priority.High
                }
            },
            Notes = new List<Note>
            {
                new()
                {
                    Date = DateTime.UtcNow.AddDays(-1),
                    Title = "Note title",
                    Content = "Content with\nnewline",
                    Tags = new List<string> { "tag1" }
                }
            }
        };

        var result = renderer.Render(data);

        Assert.NotNull(result);
        Assert.True(result.Length > 0);
        Assert.Equal(ReportFormat.Csv, renderer.Format);

        var csv = System.Text.Encoding.UTF8.GetString(result);
        Assert.Contains("Tasks", csv);
        Assert.Contains("Notes", csv);
        Assert.Contains("Task with, comma", csv);
    }

    [Fact]
    public void Render_ProperlyEscapesFields()
    {
        var renderer = new CsvReportRenderer();
        var data = new ReportData
        {
            RecruitName = "Test",
            Department = "Eng",
            ReportStartDate = DateTime.UtcNow.AddDays(-7),
            ReportEndDate = DateTime.UtcNow,
            GeneratedByName = "Admin",
            Categories = new List<string> { "tasks" },
            Tasks = new List<TaskEntity>
            {
                new()
                {
                    Date = DateTime.UtcNow,
                    Title = "Title with \"quotes\" and, commas",
                    Category = TaskCategory.Training,
                    Status = TaskStatus.NotStarted,
                    Priority = Priority.Low
                }
            }
        };

        var result = renderer.Render(data);
        var csv = System.Text.Encoding.UTF8.GetString(result);

        Assert.Contains("\"Title with \"\"quotes\"\" and, commas\"", csv);
    }
}
