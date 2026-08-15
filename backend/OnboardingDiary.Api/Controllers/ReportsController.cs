using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet]
    public async Task<IActionResult> Generate([FromQuery] ReportQuery query, CancellationToken cancellationToken)
    {
        var file = await _reportService.GenerateAsync(query, cancellationToken);
        return File(file.Content, file.ContentType, file.FileName);
    }
}
