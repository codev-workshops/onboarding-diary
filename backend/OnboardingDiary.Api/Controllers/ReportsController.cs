using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.DTOs.Reports;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(ReportResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetReport(
        [FromQuery] DateTime dateFrom,
        [FromQuery] DateTime dateTo,
        [FromQuery] string category = "all",
        [FromQuery] int? userId = null)
    {
        var (currentUserId, currentUserRole) = GetCurrentUser();
        var request = new ReportRequestDto
        {
            DateFrom = dateFrom,
            DateTo = dateTo,
            Category = category,
            UserId = userId
        };

        var report = await _reportService.GenerateReportAsync(request, currentUserId, currentUserRole);
        return Ok(report);
    }

    [HttpGet("download")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Download(
        [FromQuery] DateTime dateFrom,
        [FromQuery] DateTime dateTo,
        [FromQuery] string format = "pdf",
        [FromQuery] string category = "all",
        [FromQuery] int? userId = null)
    {
        var (currentUserId, currentUserRole) = GetCurrentUser();
        var request = new ReportRequestDto
        {
            DateFrom = dateFrom,
            DateTo = dateTo,
            Category = category,
            UserId = userId
        };

        if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
        {
            var csvBytes = await _reportService.GenerateCsvAsync(request, currentUserId, currentUserRole);
            var fileName = $"report_{dateFrom:yyyyMMdd}_{dateTo:yyyyMMdd}.csv";
            return File(csvBytes, "text/csv", fileName);
        }
        else
        {
            var pdfBytes = await _reportService.GeneratePdfAsync(request, currentUserId, currentUserRole);
            var fileName = $"report_{dateFrom:yyyyMMdd}_{dateTo:yyyyMMdd}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
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
