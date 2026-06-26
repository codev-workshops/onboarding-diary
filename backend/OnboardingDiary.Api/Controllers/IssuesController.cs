using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Common.Exceptions;
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
        var query = new IssueListQuery(page, limit, status, severity, startDate, endDate, recruitId);
        var result = await _issueService.ListAsync(query, ct);
        return Ok(new { issues = result.Items, total = result.Total, page = result.Page, totalPages = result.TotalPages });
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateIssueRequest request,
        [FromServices] IValidator<CreateIssueRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var issue = await _issueService.CreateAsync(request, ct);
        return StatusCode(201, new { issue });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct = default)
    {
        var issue = await _issueService.GetByIdAsync(id, ct);
        if (issue is null) throw new NotFoundException("Issue", id);
        return Ok(new { issue });
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
            throw new FluentValidation.ValidationException(validation.Errors);

        var issue = await _issueService.UpdateAsync(id, request, ct);
        if (issue is null) throw new NotFoundException("Issue", id);
        return Ok(new { issue });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var deleted = await _issueService.DeleteAsync(id, ct);
        if (!deleted) throw new NotFoundException("Issue", id);
        return NoContent();
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
            throw new FluentValidation.ValidationException(validation.Errors);

        var issue = await _issueService.EscalateAsync(id, request, ct);
        if (issue is null) throw new NotFoundException("Issue", id);
        return Ok(new { issue });
    }
}
