using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Application.Common.Exceptions;
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
        var query = new TaskListQuery(page, limit, startDate, endDate, category, status, priority, recruitId);
        var result = await _taskService.ListAsync(query, ct);
        return Ok(new { tasks = result.Items, total = result.Total, page = result.Page, totalPages = result.TotalPages });
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateTaskRequest request,
        [FromServices] IValidator<CreateTaskRequest> validator,
        CancellationToken ct = default)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            throw new FluentValidation.ValidationException(validation.Errors);

        var task = await _taskService.CreateAsync(request, ct);
        return StatusCode(201, new { task });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct = default)
    {
        var task = await _taskService.GetByIdAsync(id, ct);
        if (task is null) throw new NotFoundException("Task", id);
        return Ok(new { task });
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
            throw new FluentValidation.ValidationException(validation.Errors);

        var task = await _taskService.UpdateAsync(id, request, ct);
        if (task is null) throw new NotFoundException("Task", id);
        return Ok(new { task });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        var deleted = await _taskService.DeleteAsync(id, ct);
        if (!deleted) throw new NotFoundException("Task", id);
        return NoContent();
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] Guid? recruitId = null, CancellationToken ct = default)
    {
        var stats = await _taskService.GetStatsAsync(recruitId, ct);
        return Ok(stats);
    }
}
