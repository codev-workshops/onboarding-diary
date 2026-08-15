namespace OnboardingDiary.Api.Dtos;

public enum ReportType
{
    Tasks = 0,
    Issues = 1,
    Feedback = 2,
    Combined = 3
}

public enum ReportFormat
{
    Pdf = 0,
    Csv = 1
}

public class ReportQuery
{
    public ReportType Type { get; set; } = ReportType.Combined;

    public ReportFormat Format { get; set; } = ReportFormat.Pdf;

    public DateTime? From { get; set; }

    public DateTime? To { get; set; }

    public int? RecruitId { get; set; }
}

public class ReportFile
{
    public byte[] Content { get; init; } = Array.Empty<byte>();

    public string ContentType { get; init; } = "application/octet-stream";

    public string FileName { get; init; } = "report";
}
