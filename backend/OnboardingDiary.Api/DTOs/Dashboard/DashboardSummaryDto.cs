namespace OnboardingDiary.Api.DTOs.Dashboard;

public class DashboardSummaryDto
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public double TaskCompletionPercentage { get; set; }
    public int OpenIssues { get; set; }
    public int TotalIssues { get; set; }
    public int TotalFeedback { get; set; }
    public int TotalNotes { get; set; }
    public List<RecentEntryDto> RecentEntries { get; set; } = new();
    public int OnboardingDaysElapsed { get; set; }
    public DateTime StartDate { get; set; }
}
