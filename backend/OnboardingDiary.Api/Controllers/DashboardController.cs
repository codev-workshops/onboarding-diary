using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.DTOs.Dashboard;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecruitDashboard()
    {
        var (currentUserId, _) = GetCurrentUser();
        var result = await _dashboardService.GetRecruitDashboardAsync(currentUserId);
        return Ok(result);
    }

    [HttpGet("recruits")]
    [Authorize(Policy = "RequireManager")]
    [ProducesResponseType(typeof(List<RecruitOverviewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetManagerDashboard()
    {
        var (currentUserId, _) = GetCurrentUser();
        var result = await _dashboardService.GetManagerDashboardAsync(currentUserId);
        return Ok(result);
    }

    [HttpGet("system")]
    [Authorize(Policy = "RequireAdmin")]
    [ProducesResponseType(typeof(SystemOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSystemDashboard()
    {
        var result = await _dashboardService.GetSystemDashboardAsync();
        return Ok(result);
    }

    private (int UserId, UserRole Role) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User not authenticated.");
        var roleClaim = User.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException("User role not found.");

        return (int.Parse(userIdClaim), Enum.Parse<UserRole>(roleClaim));
    }
}
