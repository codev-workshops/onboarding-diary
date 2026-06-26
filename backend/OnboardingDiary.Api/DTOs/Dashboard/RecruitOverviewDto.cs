namespace OnboardingDiary.Api.DTOs.Dashboard;

public class RecruitOverviewDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public int DaysElapsed { get; set; }
    public int TasksCompleted { get; set; }
    public int TotalTasks { get; set; }
    public int OpenIssues { get; set; }
    public int FeedbackCount { get; set; }
}
