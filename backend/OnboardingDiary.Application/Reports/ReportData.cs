using OnboardingDiary.Domain.Entities;
using FeedbackEntity = OnboardingDiary.Domain.Entities.Feedback;

namespace OnboardingDiary.Application.Reports;

public class ReportData
{
    public string RecruitName { get; init; } = string.Empty;
    public string Department { get; init; } = string.Empty;
    public DateTime RecruitStartDate { get; init; }
    public DateTime ReportStartDate { get; init; }
    public DateTime ReportEndDate { get; init; }
    public string GeneratedByName { get; init; } = string.Empty;
    public DateTime GeneratedOn { get; init; } = DateTime.UtcNow;
    public List<string> Categories { get; init; } = new();
    public List<TaskEntity> Tasks { get; init; } = new();
    public List<Issue> Issues { get; init; } = new();
    public List<FeedbackEntity> Feedbacks { get; init; } = new();
    public List<Note> Notes { get; init; } = new();
}
