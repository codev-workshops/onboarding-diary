using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Dashboard;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var summary = await _dashboardService.GetSummaryAsync(ct);
        return Ok(summary);
    }

    [HttpGet("team")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> GetTeam([FromQuery] string? department, CancellationToken ct)
    {
        var recruits = await _dashboardService.GetTeamAsync(department, ct);
        return Ok(new { recruits });
    }
}
