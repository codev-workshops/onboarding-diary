namespace OnboardingDiary.Api.DTOs.Dashboard;

public class RecentEntryDto
{
    public string Type { get; set; } = string.Empty;
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? Status { get; set; }
}
