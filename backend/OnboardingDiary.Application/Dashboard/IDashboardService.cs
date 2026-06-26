using OnboardingDiary.Application.Dashboard.Dtos;

namespace OnboardingDiary.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default);
    Task<IReadOnlyList<TeamRecruitDto>> GetTeamAsync(string? department, CancellationToken ct = default);
}
