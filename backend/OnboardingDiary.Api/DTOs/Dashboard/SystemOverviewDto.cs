namespace OnboardingDiary.Api.DTOs.Dashboard;

public class SystemOverviewDto
{
    public Dictionary<string, int> UserCounts { get; set; } = new();
    public Dictionary<string, int> EntryCounts { get; set; } = new();
    public List<RecentActivityDto> RecentActivity { get; set; } = new();
}
