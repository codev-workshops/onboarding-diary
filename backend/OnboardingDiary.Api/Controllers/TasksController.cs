using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Tasks;
using OnboardingDiary.Application.Tasks.Dtos;
using OnboardingDiary.Domain.Enums;
using TaskStatus = OnboardingDiary.Domain.Enums.TaskStatus;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] TaskCategory? category = null,
        [FromQuery] TaskStatus? status = null,
        [FromQuery] Priority? priority = null,
        [FromQuery] Guid? recruitId = null,
        CancellationToken ct = default)
    {
        try
        {
            var query = new TaskListQuery(page, limit, startDate, endDate, category, status, priority, recruitId);
            var result = await _taskService.ListAsync(query, ct);
            return Ok(new { tasks = result.Items, total = result.Total, page = result.Page, totalPages = result.TotalPages });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTaskRequest request,
        [FromServices] IValidator<CreateTaskRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var task = await _taskService.CreateAsync(request, ct);
            return StatusCode(201, new { task });
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
            var task = await _taskService.GetByIdAsync(id, ct);
            if (task is null) return NotFound(new { Error = "Task not found." });
            return Ok(new { task });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateTaskRequest request,
        [FromServices] IValidator<UpdateTaskRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return BadRequest(new { Errors = validation.Errors.Select(e => new { e.PropertyName, e.ErrorMessage }) });

        try
        {
            var task = await _taskService.UpdateAsync(id, request, ct);
            if (task is null) return NotFound(new { Error = "Task not found or access denied." });
            return Ok(new { task });
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
            var deleted = await _taskService.DeleteAsync(id, ct);
            if (!deleted) return NotFound(new { Error = "Task not found or access denied." });
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] Guid? recruitId = null, CancellationToken ct = default)
    {
        try
        {
            var stats = await _taskService.GetStatsAsync(recruitId, ct);
            return Ok(stats);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
