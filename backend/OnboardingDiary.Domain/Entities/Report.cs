using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Domain.Entities;

public class Report : AuditableEntity
{
    public Guid GeneratedBy { get; set; }
    public Guid RecruitId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<string> Categories { get; set; } = new();
    public ReportFormat Format { get; set; }
    public string? FileUrl { get; set; }

    public User GeneratedByUser { get; set; } = null!;
    public User Recruit { get; set; } = null!;
}
