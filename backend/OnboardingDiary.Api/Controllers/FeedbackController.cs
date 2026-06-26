using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Feedback;
using OnboardingDiary.Application.Feedback.Dtos;
using OnboardingDiary.Domain.Enums;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/feedback")]
[Authorize]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedbackService;

    public FeedbackController(IFeedbackService feedbackService)
    {
        _feedbackService = feedbackService;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] FeedbackType? type = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] Guid? recruitId = null,
        [FromQuery] string? department = null,
        CancellationToken ct = default)
    {
        var query = new FeedbackListQuery(page, limit, type, startDate, endDate, recruitId, department);
        var result = await _feedbackService.ListAsync(query, ct);
        return Ok(new { feedback = result.Items, total = result.Total, page = result.Page, totalPages = result.TotalPages });
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateFeedbackRequest request,
        [FromServices] IValidator<CreateFeedbackRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var feedback = await _feedbackService.CreateAsync(request, ct);
        return StatusCode(201, new { feedback });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct = default)
    {
        var feedback = await _feedbackService.GetByIdAsync(id, ct);
        if (feedback is null) throw new NotFoundException("Feedback", id);
        return Ok(new { feedback });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateFeedbackRequest request,
        [FromServices] IValidator<UpdateFeedbackRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var feedback = await _feedbackService.UpdateAsync(id, request, ct);
        if (feedback is null) throw new NotFoundException("Feedback", id);
        return Ok(new { feedback });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var deleted = await _feedbackService.DeleteAsync(id, ct);
        if (!deleted) throw new NotFoundException("Feedback", id);
        return NoContent();
    }
}
