using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Reports;

public interface IReportRenderer
{
    ReportFormat Format { get; }
    byte[] Render(ReportData data);
}
