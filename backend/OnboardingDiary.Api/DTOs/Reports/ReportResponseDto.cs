namespace OnboardingDiary.Api.DTOs.Reports;

public class ReportResponseDto
{
    public ReportPeriodDto ReportPeriod { get; set; } = null!;
    public DateTime GeneratedAt { get; set; }
    public string GeneratedBy { get; set; } = string.Empty;
    public int GeneratedForUserId { get; set; }
    public string GeneratedForUserName { get; set; } = string.Empty;
    public ReportSectionDto? Tasks { get; set; }
    public ReportSectionDto? Issues { get; set; }
    public ReportSectionDto? Feedback { get; set; }
    public ReportSectionDto? Notes { get; set; }
}

public class ReportPeriodDto
{
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
}

public class ReportSectionDto
{
    public int Total { get; set; }
    public int Completed { get; set; }
    public int Resolved { get; set; }
    public List<ReportEntryDto> Entries { get; set; } = new();
}

public class ReportEntryDto
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Severity { get; set; }
    public string? Type { get; set; }
    public string? Category { get; set; }
    public string? Tags { get; set; }
}
