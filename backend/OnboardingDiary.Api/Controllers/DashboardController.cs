using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        [FromQuery] int? recruitId,
        CancellationToken cancellationToken) =>
        Ok(await _dashboardService.GetSummaryAsync(recruitId, cancellationToken));

    [HttpGet("manager")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<ActionResult<ManagerDashboardDto>> GetManagerDashboard(CancellationToken cancellationToken) =>
        Ok(await _dashboardService.GetManagerDashboardAsync(cancellationToken));

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<AdminDashboardDto>> GetAdminDashboard(CancellationToken cancellationToken) =>
        Ok(await _dashboardService.GetAdminDashboardAsync(cancellationToken));
}
