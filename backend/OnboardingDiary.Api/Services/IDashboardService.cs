using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int? recruitId, CancellationToken cancellationToken = default);
}
