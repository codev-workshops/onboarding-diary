namespace OnboardingDiary.Application.Reports;

public interface IReportDataCollector
{
    Task<ReportData> CollectAsync(Guid subjectUserId, Guid generatedByUserId, DateTime startDate, DateTime endDate, List<string> categories, CancellationToken ct = default);
}
