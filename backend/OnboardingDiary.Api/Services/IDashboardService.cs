using OnboardingDiary.Api.Dtos;

namespace OnboardingDiary.Api.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int? recruitId, CancellationToken cancellationToken = default);

    /// <summary>Aggregates across the calling manager's overseen recruits (all recruits for an admin).</summary>
    Task<ManagerDashboardDto> GetManagerDashboardAsync(CancellationToken cancellationToken = default);

    Task<AdminDashboardDto> GetAdminDashboardAsync(CancellationToken cancellationToken = default);
}
