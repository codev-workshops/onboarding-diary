using OnboardingDiary.Application.Common;
using OnboardingDiary.Application.Reports.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Application.Reports;

public interface IReportService
{
    Task<GenerateReportResponse> GenerateAsync(GenerateReportRequest request, CancellationToken ct = default);
    Task<(Stream Content, string ContentType, string FileName)> DownloadAsync(Guid reportId, ReportFormat? format, CancellationToken ct = default);
    Task<PagedResult<ReportListItemDto>> ListAsync(ReportListQuery query, CancellationToken ct = default);
}
