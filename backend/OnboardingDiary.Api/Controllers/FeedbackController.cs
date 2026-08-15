using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedbackService;

    public FeedbackController(IFeedbackService service)
    {
        _feedbackService = service;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<FeedbackDto>>> Get(
        [FromQuery] FeedbackQuery query,
        CancellationToken cancellationToken) =>
        Ok(await _feedbackService.GetAsync(query, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<FeedbackDto>> GetById(int id, CancellationToken cancellationToken) =>
        Ok(await _feedbackService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<FeedbackDto>> Create(SaveFeedbackRequest request, CancellationToken cancellationToken)
    {
        var created = await _feedbackService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<FeedbackDto>> Update(
        int id,
        SaveFeedbackRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _feedbackService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _feedbackService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
