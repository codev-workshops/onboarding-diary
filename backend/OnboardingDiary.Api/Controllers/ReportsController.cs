using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Reports;
using OnboardingDiary.Application.Reports.Dtos;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(
        [FromBody] GenerateReportRequest request,
        [FromServices] IValidator<GenerateReportRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var result = await _reportService.GenerateAsync(request, ct);
            return Ok(new { reportId = result.ReportId, downloadUrl = result.DownloadUrl });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { Error = ex.Message });
        }
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(
        Guid id,
        [FromQuery] string? format = null,
        CancellationToken ct = default)
    {
        try
        {
            Domain.Enums.ReportFormat? parsedFormat = null;
            if (!string.IsNullOrWhiteSpace(format) &&
                Enum.TryParse<Domain.Enums.ReportFormat>(format, ignoreCase: true, out var f))
            {
                parsedFormat = f;
            }

            var (stream, contentType, fileName) = await _reportService.DownloadAsync(id, parsedFormat, ct);
            return File(stream, contentType, fileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { Error = "Report not found." });
        }
        catch (FileNotFoundException)
        {
            return NotFound(new { Error = "Report file not found." });
        }
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        CancellationToken ct = default)
    {
        try
        {
            var query = new ReportListQuery(page, limit);
            var result = await _reportService.ListAsync(query, ct);
            return Ok(new { reports = result.Items, total = result.Total });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
