using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnboardingDiary.Api.DTOs.Common;
using OnboardingDiary.Api.DTOs.Tasks;
using OnboardingDiary.Api.Entities.Enums;
using OnboardingDiary.Api.Services;

namespace OnboardingDiary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<TaskResponseDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] string? category,
        [FromQuery] TaskEntryStatus? status,
        [FromQuery] Priority? priority,
        [FromQuery] int? userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = true)
    {
        var (currentUserId, currentUserRole) = GetCurrentUser();
        var pagination = new PaginationParams
        {
            Page = page,
            PageSize = pageSize,
            SortBy = sortBy,
            SortDescending = sortDescending
        };

        var result = await _taskService.GetAllAsync(
            currentUserId, currentUserRole, pagination,
            dateFrom, dateTo, category, status, priority, userId);

        return Ok(result);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(TaskResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var (currentUserId, currentUserRole) = GetCurrentUser();
        var result = await _taskService.GetByIdAsync(id, currentUserId, currentUserRole);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TaskResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
    {
        var (currentUserId, _) = GetCurrentUser();
        var result = await _taskService.CreateAsync(dto, currentUserId);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(TaskResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskDto dto)
    {
        var (currentUserId, _) = GetCurrentUser();
        var result = await _taskService.UpdateAsync(id, dto, currentUserId);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var (currentUserId, _) = GetCurrentUser();
        await _taskService.DeleteAsync(id, currentUserId);
        return NoContent();
    }

    private (int UserId, UserRole Role) GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User not authenticated.");
        var roleClaim = User.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException("User role not found.");

        return (int.Parse(userIdClaim), Enum.Parse<UserRole>(roleClaim));
    }
}
