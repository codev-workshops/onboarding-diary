using OnboardingDiary.Api.DTOs.Dashboard;

namespace OnboardingDiary.Api.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetRecruitDashboardAsync(int userId);
    Task<List<RecruitOverviewDto>> GetManagerDashboardAsync(int managerId);
    Task<SystemOverviewDto> GetSystemDashboardAsync();
}
