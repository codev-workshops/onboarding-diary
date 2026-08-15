using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/issues")]
public class IssuesController : ControllerBase
{
    private readonly IIssueService _issueService;

    public IssuesController(IIssueService service)
    {
        _issueService = service;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<IssueDto>>> Get(
        [FromQuery] IssueQuery query,
        CancellationToken cancellationToken) =>
        Ok(await _issueService.GetAsync(query, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IssueDto>> GetById(int id, CancellationToken cancellationToken) =>
        Ok(await _issueService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<IssueDto>> Create(SaveIssueRequest request, CancellationToken cancellationToken)
    {
        var created = await _issueService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<IssueDto>> Update(
        int id,
        SaveIssueRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _issueService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _issueService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
