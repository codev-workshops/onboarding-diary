using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Common.Exceptions;
using OnboardingDiary.Application.Notes;
using OnboardingDiary.Application.Notes.Dtos;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;

    public NotesController(INoteService noteService)
    {
        _noteService = noteService;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? tags = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        CancellationToken ct = default)
    {
        var query = new NoteListQuery(page, limit, search, tags, startDate, endDate);
        var result = await _noteService.ListAsync(query, ct);
        return Ok(new { notes = result.Items, total = result.Total, page = result.Page, totalPages = result.TotalPages });
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateNoteRequest request,
        [FromServices] IValidator<CreateNoteRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var note = await _noteService.CreateAsync(request, ct);
        return StatusCode(201, new { note });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct = default)
    {
        var note = await _noteService.GetByIdAsync(id, ct);
        if (note is null) throw new NotFoundException("Note", id);
        return Ok(new { note });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateNoteRequest request,
        [FromServices] IValidator<UpdateNoteRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var note = await _noteService.UpdateAsync(id, request, ct);
        if (note is null) throw new NotFoundException("Note", id);
        return Ok(new { note });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var deleted = await _noteService.DeleteAsync(id, ct);
        if (!deleted) throw new NotFoundException("Note", id);
        return NoContent();
    }
}
