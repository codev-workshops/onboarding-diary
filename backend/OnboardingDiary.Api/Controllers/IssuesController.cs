using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Issues;
using OnboardingDiary.Application.Issues.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/issues")]
[Authorize]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _issueService;

    public IssuesController(IIssueService issueService)
    {
        _issueService = issueService;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] IssueStatus? status = null,
        [FromQuery] IssueSeverity? severity = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] Guid? recruitId = null,
        CancellationToken ct = default)
    {
        try
        {
            var query = new IssueListQuery(page, limit, status, severity, startDate, endDate, recruitId);
            var result = await _issueService.ListAsync(query, ct);
            return Ok(new { issues = result.Items, total = result.Total, page = result.Page, totalPages = result.TotalPages });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateIssueRequest request,
        [FromServices] IValidator<CreateIssueRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var issue = await _issueService.CreateAsync(request, ct);
            return StatusCode(201, new { issue });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct = default)
    {
        try
        {
            var issue = await _issueService.GetByIdAsync(id, ct);
            if (issue is null) return NotFound(new { Error = "Issue not found." });
            return Ok(new { issue });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateIssueRequest request,
        [FromServices] IValidator<UpdateIssueRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var issue = await _issueService.UpdateAsync(id, request, ct);
            if (issue is null) return NotFound(new { Error = "Issue not found or access denied." });
            return Ok(new { issue });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        try
        {
            var deleted = await _issueService.DeleteAsync(id, ct);
            if (!deleted) return NotFound(new { Error = "Issue not found or access denied." });
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{id:guid}/escalate")]
    public async Task<IActionResult> Escalate(
        Guid id,
        [FromBody] EscalateIssueRequest request,
        [FromServices] IValidator<EscalateIssueRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var issue = await _issueService.EscalateAsync(id, request, ct);
            if (issue is null) return NotFound(new { Error = "Issue not found or access denied." });
            return Ok(new { issue });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
