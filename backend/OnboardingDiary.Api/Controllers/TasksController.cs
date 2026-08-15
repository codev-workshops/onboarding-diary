using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.Dtos;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService service)
    {
        _taskService = service;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<TaskDto>>> Get(
        [FromQuery] TaskQuery query,
        CancellationToken cancellationToken) =>
        Ok(await _taskService.GetAsync(query, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskDto>> GetById(int id, CancellationToken cancellationToken) =>
        Ok(await _taskService.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create(SaveTaskRequest request, CancellationToken cancellationToken)
    {
        var created = await _taskService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TaskDto>> Update(
        int id,
        SaveTaskRequest request,
        CancellationToken cancellationToken) =>
        Ok(await _taskService.UpdateAsync(id, request, cancellationToken));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _taskService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
