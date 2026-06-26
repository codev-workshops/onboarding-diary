namespace OnboardingDiary.Api.DTOs.Dashboard;

public class RecentActivityDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}
