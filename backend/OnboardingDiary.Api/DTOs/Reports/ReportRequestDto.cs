namespace OnboardingDiary.Api.DTOs.Reports;

public class ReportRequestDto
{
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public string Category { get; set; } = "all";
    public int? UserId { get; set; }
}
