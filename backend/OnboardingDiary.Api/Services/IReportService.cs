using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IReportService
{
    Task<ReportFile> GenerateAsync(ReportQuery query, CancellationToken cancellationToken = default);
}
