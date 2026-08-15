using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/notes")]
public class NotesController : ControllerBase
{
    private readonly INoteService _noteService;

    public NotesController(INoteService service)
    {
        _noteService = service;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<NoteDto>>> Get(
        [FromQuery] NoteQuery query,
        CancellationToken cancellationToken) =>
        Ok(await _noteService.GetAsync(query, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<NoteDto>> GetById(int id, CancellationToken cancellationToken) =>
        Ok(await _noteService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(SaveNoteRequest request, CancellationToken cancellationToken)
    {
        var created = await _noteService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<NoteDto>> Update(
        int id,
        SaveNoteRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _noteService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _noteService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
